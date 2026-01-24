import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Configuration
const config = new pulumi.Config();
const environment = config.get("environment") || "dev";
const appName = "workout-log";
const instanceType = config.get("instanceType") || "t3.micro";

// Resource naming helper
const resourceName = (name: string) => `${appName}-${environment}-${name}`;


// Get latest Amazon Linux 2023 AMI
const ami = aws.ec2.getAmi({
  mostRecent: true,
  owners: ["amazon"],
  filters: [
    {
      name: "name",
      values: ["al2023-ami-2023*-x86_64"],
    },
    {
      name: "virtualization-type",
      values: ["hvm"],
    },
  ],
});

// =============================================================================
// VPC and Networking
// =============================================================================

const vpc = new awsx.ec2.Vpc(resourceName("vpc"), {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  numberOfAvailabilityZones: 2,
  subnetStrategy: "Auto",
  natGateways: {
    strategy: awsx.ec2.NatGatewayStrategy.None,
  },
  subnetSpecs: [
    {
      type: awsx.ec2.SubnetType.Public,
      cidrMask: 24,
    },
  ],
  tags: {
    Name: resourceName("vpc"),
    Environment: environment,
  },
});

// =============================================================================
// Security Groups
// =============================================================================

// Security group for EC2 instance
const ec2SecurityGroup = new aws.ec2.SecurityGroup(resourceName("ec2-sg"), {
  vpcId: vpc.vpcId,
  description: "Security group for Workout Log backend server",
  ingress: [
    {
      description: "SSH access",
      fromPort: 22,
      toPort: 22,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"], // Consider restricting to your IP in production
    },
    {
      description: "HTTP access for health checks and redirect",
      fromPort: 80,
      toPort: 80,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      description: "HTTPS access",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      description: "Backend API port",
      fromPort: 3001,
      toPort: 3001,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    {
      description: "Allow all outbound traffic",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    Name: resourceName("ec2-sg"),
    Environment: environment,
  },
});

// =============================================================================
// IAM Role for EC2 Instance
// =============================================================================

const ec2Role = new aws.iam.Role(resourceName("ec2-role"), {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ec2.amazonaws.com",
        },
      },
    ],
  }),
  tags: {
    Name: resourceName("ec2-role"),
    Environment: environment,
  },
});

// Attach SSM policy for Session Manager access (no SSH keys needed)
new aws.iam.RolePolicyAttachment(resourceName("ec2-ssm-policy"), {
  role: ec2Role.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
});

// Attach S3 read-only policy for deployment artifacts
new aws.iam.RolePolicyAttachment(resourceName("ec2-s3-policy"), {
  role: ec2Role.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
});

// CloudWatch Logs policy
new aws.iam.RolePolicy(resourceName("ec2-cloudwatch-policy"), {
  role: ec2Role.id,
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ],
        Resource: "arn:aws:logs:*:*:*",
      },
    ],
  }),
});

// Instance profile
const instanceProfile = new aws.iam.InstanceProfile(resourceName("ec2-profile"), {
  role: ec2Role.name,
  tags: {
    Name: resourceName("ec2-profile"),
    Environment: environment,
  },
});

// =============================================================================
// CloudWatch Log Group
// =============================================================================

const logGroup = new aws.cloudwatch.LogGroup(resourceName("logs"), {
  retentionInDays: environment === "prod" ? 30 : 7,
  tags: {
    Name: resourceName("logs"),
    Environment: environment,
  },
});

// =============================================================================
// EC2 Instance for Backend
// =============================================================================

// User data script to setup the server
const userData = pulumi.interpolate`#!/bin/bash
set -e

# Log all output
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== Starting Workout Log Server Setup ==="

# Update system
dnf update -y

# Install Node.js 20.x
dnf install -y nodejs20 npm git

# Create app directory
mkdir -p /opt/workout-log
cd /opt/workout-log

# Create app user
useradd -r -s /bin/false workout-app || true

# Create data directories with proper permissions
mkdir -p /opt/workout-log/data
mkdir -p /opt/workout-log/uploads/profiles
chown -R workout-app:workout-app /opt/workout-log

# Create systemd service for the backend
cat > /etc/systemd/system/workout-log.service << 'SERVICEEOF'
[Unit]
Description=Workout Log Backend Server
After=network.target

[Service]
Type=simple
User=workout-app
WorkingDirectory=/opt/workout-log
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=DATABASE_PATH=/opt/workout-log/data/workout.db
Environment=UPLOADS_PATH=/opt/workout-log/uploads
ExecStart=/usr/bin/node /opt/workout-log/server/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=workout-log

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Enable the service (will start after code deployment)
systemctl daemon-reload
systemctl enable workout-log

# Install CloudWatch agent for logs
dnf install -y amazon-cloudwatch-agent

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWEOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "${logGroup.name}",
            "log_stream_name": "{instance_id}/user-data"
          }
        ]
      }
    }
  }
}
CWEOF

# Start CloudWatch agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Install nginx as reverse proxy
dnf install -y nginx

# Configure nginx
cat > /etc/nginx/conf.d/workout-log.conf << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Profile uploads
    location /uploads/ {
        alias /opt/workout-log/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
NGINXEOF

# Remove default nginx config
rm -f /etc/nginx/conf.d/default.conf

# Enable and start nginx
systemctl enable nginx
systemctl start nginx

echo "=== Server Setup Complete ==="
echo "Deploy your code to /opt/workout-log and restart the workout-log service"
`;

// EC2 Instance (using SSM for access - no SSH key required)
const ec2Instance = new aws.ec2.Instance(resourceName("server"), {
  ami: ami.then((a) => a.id),
  instanceType: instanceType,
  subnetId: vpc.publicSubnetIds.apply((ids) => ids[0]),
  vpcSecurityGroupIds: [ec2SecurityGroup.id],
  iamInstanceProfile: instanceProfile.name,
  userData: userData,
  rootBlockDevice: {
    volumeSize: 20,
    volumeType: "gp3",
    encrypted: true,
    deleteOnTermination: true,
  },
  tags: {
    Name: resourceName("server"),
    Environment: environment,
  },
});

// Elastic IP for stable public address
const eip = new aws.ec2.Eip(resourceName("eip"), {
  instance: ec2Instance.id,
  tags: {
    Name: resourceName("eip"),
    Environment: environment,
  },
});

// =============================================================================
// S3 Bucket for Frontend Static Hosting
// =============================================================================

const frontendBucket = new aws.s3.Bucket(resourceName("frontend"), {
  bucket: `${resourceName("frontend")}-${Date.now()}`,
  tags: {
    Name: resourceName("frontend"),
    Environment: environment,
  },
});

// Block all public access (CloudFront will serve content)
new aws.s3.BucketPublicAccessBlock(
  resourceName("frontend-public-access-block"),
  {
    bucket: frontendBucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  }
);

// =============================================================================
// CloudFront Distribution
// =============================================================================

// Origin Access Control for S3
const oac = new aws.cloudfront.OriginAccessControl(resourceName("oac"), {
  name: resourceName("oac"),
  description: "OAC for Workout Log frontend",
  originAccessControlOriginType: "s3",
  signingBehavior: "always",
  signingProtocol: "sigv4",
});

// CloudFront distribution
const distribution = new aws.cloudfront.Distribution(resourceName("cdn"), {
  enabled: true,
  isIpv6Enabled: true,
  comment: "Workout Log Frontend CDN",
  defaultRootObject: "index.html",
  priceClass: "PriceClass_100", // US, Canada, Europe only

  origins: [
    // S3 origin for static frontend
    {
      domainName: frontendBucket.bucketRegionalDomainName,
      originId: "s3-frontend",
      originAccessControlId: oac.id,
    },
    // EC2 origin for API
    {
      domainName: eip.publicDns,
      originId: "ec2-api",
      customOriginConfig: {
        httpPort: 80,
        httpsPort: 443,
        originProtocolPolicy: "http-only",
        originSslProtocols: ["TLSv1.2"],
      },
    },
  ],

  defaultCacheBehavior: {
    targetOriginId: "s3-frontend",
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD"],
    compress: true,
    forwardedValues: {
      queryString: false,
      cookies: {
        forward: "none",
      },
    },
    minTtl: 0,
    defaultTtl: 86400,
    maxTtl: 31536000,
  },

  // API behavior - pass through to EC2
  orderedCacheBehaviors: [
    {
      pathPattern: "/api/*",
      targetOriginId: "ec2-api",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      forwardedValues: {
        queryString: true,
        headers: ["Authorization", "X-User-Id", "Content-Type"],
        cookies: {
          forward: "all",
        },
      },
      minTtl: 0,
      defaultTtl: 0,
      maxTtl: 0,
    },
    {
      pathPattern: "/uploads/*",
      targetOriginId: "ec2-api",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      forwardedValues: {
        queryString: false,
        cookies: {
          forward: "none",
        },
      },
      minTtl: 0,
      defaultTtl: 86400,
      maxTtl: 31536000,
    },
  ],

  // SPA routing - return index.html for 404s
  customErrorResponses: [
    {
      errorCode: 404,
      responseCode: 200,
      responsePagePath: "/index.html",
      errorCachingMinTtl: 0,
    },
    {
      errorCode: 403,
      responseCode: 200,
      responsePagePath: "/index.html",
      errorCachingMinTtl: 0,
    },
  ],

  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },

  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },

  tags: {
    Name: resourceName("cdn"),
    Environment: environment,
  },
});

// S3 bucket policy to allow CloudFront access
new aws.s3.BucketPolicy(resourceName("frontend-policy"), {
  bucket: frontendBucket.id,
  policy: pulumi.all([frontendBucket.arn, distribution.arn]).apply(([bucketArn, distArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AllowCloudFrontServicePrincipal",
          Effect: "Allow",
          Principal: {
            Service: "cloudfront.amazonaws.com",
          },
          Action: "s3:GetObject",
          Resource: `${bucketArn}/*`,
          Condition: {
            StringEquals: {
              "AWS:SourceArn": distArn,
            },
          },
        },
      ],
    })
  ),
});

// =============================================================================
// Outputs
// =============================================================================

export const vpcId = vpc.vpcId;
export const ec2InstanceId = ec2Instance.id;
export const ec2PublicIp = eip.publicIp;
export const ec2PublicDns = eip.publicDns;
export const frontendBucketName = frontendBucket.bucket;
export const cloudfrontDistributionId = distribution.id;
export const cloudfrontDomainName = distribution.domainName;
export const appUrl = pulumi.interpolate`https://${distribution.domainName}`;
export const apiDirectUrl = pulumi.interpolate`http://${eip.publicIp}:3001`;

// Deployment instructions
export const deploymentInstructions = pulumi.interpolate`
=== Workout Log Deployment Complete ===

Application URL: https://${distribution.domainName}
API Direct URL: http://${eip.publicIp}:3001

To deploy your code:

1. Build the frontend:
   cd /Users/georgethuku/Code/workout_log
   npm run build

2. Upload frontend to S3:
   aws s3 sync dist/ s3://${frontendBucket.bucket} --delete

3. Invalidate CloudFront cache:
   aws cloudfront create-invalidation --distribution-id ${distribution.id} --paths "/*"

4. Deploy backend to EC2 (use SSM Session Manager):
   aws ssm start-session --target ${ec2Instance.id}

   On the server:
   cd /opt/workout-log
   # Copy your server files here
   npm install --production
   sudo systemctl restart workout-log

5. Verify deployment:
   curl https://${distribution.domainName}/api/exercises
`;
