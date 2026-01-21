# Workout Log

A comprehensive full-stack workout tracking application built with modern web technologies. Track your fitness journey with real-time workout logging, personal records, detailed analytics, and support for both strength training and cardio exercises.

## ✨ Features

### **🏋️ Strength Training**
- **72 Pre-loaded Exercises** - Complete exercise library across 11 muscle groups
- **Custom Exercises** - Add your own exercises to the library
- **Real-time Workout Logging** - Track sets, reps, and weight during active workouts
- **Past Workout Logging** - Log completed workouts with historical data
- **Personal Records** - Automatic PR detection with celebration animations
- **Progressive Overload** - Track improvement trends over time

### **🏃 Cardio & Endurance**
- **8 Cardio Exercises** - Treadmill, bike, elliptical, rowing, stair climber, and more
- **Duration Tracking** - Log cardio sessions by time instead of sets/reps
- **Mixed Workouts** - Combine strength and cardio exercises in single sessions

### **📊 Analytics & Progress**
- **Training Frequency** - Visual workout history and streak tracking
- **Muscle Group Distribution** - See which muscle groups you train most
- **Gender-Specific Body Diagrams** - Interactive visual representation of training frequency
- **Progress Charts** - Weight progression, volume tracking, and performance metrics
- **Personal Records Dashboard** - Recent PRs and achievement tracking

### **👥 User Management**
- **Multiple User Profiles** - Create and switch between different user accounts
- **Authentication System** - Secure login with password hashing
- **Flexible Fitness Goals** - Select multiple fitness objectives
- **User Preferences** - Customizable units, experience levels, and personal details

### **🎨 User Experience**
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Dark Theme** - Modern UI with comprehensive dark mode
- **Real-time Updates** - Live workout timer and progress tracking
- **Intuitive Navigation** - Clean, organized interface with easy access to all features

## 🛠️ Tech Stack

### **Frontend**
| Technology | Purpose |
|------------|---------|
| **React 19** | Modern component-based UI framework |
| **TypeScript** | Type-safe JavaScript with comprehensive interfaces |
| **Vite** | Fast build tool and development server |
| **Tailwind CSS 4** | Utility-first CSS framework for styling |
| **Zustand** | Lightweight state management solution |
| **React Router 7** | Client-side routing and navigation |
| **Recharts** | Declarative charting library for analytics |
| **Lucide React** | Beautiful icon library |

### **Backend**
| Technology | Purpose |
|------------|---------|
| **Express 5** | Fast, minimalist web framework |
| **TypeScript** | Server-side type safety |
| **SQLite** | Embedded database for local development |
| **Better SQLite3** | High-performance SQLite driver with WAL support |
| **bcrypt** | Password hashing for authentication |
| **CORS** | Cross-origin resource sharing middleware |
| **UUID** | Unique identifier generation |

### **Development & Deployment**
| Technology | Purpose |
|------------|---------|
| **ESLint** | Code linting and quality enforcement |
| **tsx** | TypeScript execution for development |
| **Concurrently** | Run multiple development servers simultaneously |
| **Vite Preview** | Production build preview |

### **Database Architecture**
- **SQLite** with WAL mode for concurrent access
- **Transaction-based operations** for data integrity
- **Foreign key constraints** with CASCADE deletes
- **Indexed queries** for optimal performance
- **Automatic schema migrations** on startup

## 📋 Prerequisites

### **Required**
- **Node.js 18+** - JavaScript runtime environment
- **SQLite** - Included automatically (no separate installation needed)

### **Optional**
- **PostgreSQL 14+** - For production deployment (can be configured via environment variables)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Database Setup

**SQLite (Default - Recommended for Development)**
- No setup required! SQLite database is created automatically
- Database file: `workout.db` (created in project root)
- Schema and seed data initialize automatically on first server start

**PostgreSQL (Optional - For Production)**
If you prefer PostgreSQL for development:

```bash
createdb workout_db
```

Then configure with environment variables:

```bash
export DATABASE_URL=postgresql://username:password@localhost:5432/workout_db
```

### 3. Environment Configuration (Optional)

Override default settings with environment variables:

```bash
# Database
export DATABASE_PATH=/path/to/custom/workout.db  # SQLite only

# Server
export PORT=3001
export NODE_ENV=development

# Authentication (for production)
export JWT_SECRET=your-secret-key
```

### 4. Start development servers

```bash
npm run dev
```

This starts both the Vite frontend (port 5173) and Express backend (port 3001).

## 🚀 Scripts

### **Development**
| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend (port 5174) and backend (port 3001) concurrently |
| `npm run dev:client` | Start frontend only (Vite dev server) |
| `npm run dev:server` | Start backend only (Express with tsx watch) |

### **Production**
| Command | Description |
|---------|-------------|
| `npm run build` | Production build (TypeScript compilation + Vite build) |
| `npm run build:server` | Build server TypeScript only |
| `npm run build:client` | Build client (React) only |
| `npm start` | Start production server from built files |
| `npm run preview` | Preview production build locally |

### **Quality & Maintenance**
| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint for code quality checks |
| `npm run deploy:frontend` | Deploy frontend to S3/CloudFront |
| `npm run deploy:backend` | Deploy backend to Elastic Beanstalk |

## 📁 Project Structure

```
├── 📁 src/                          # Frontend React Application
│   ├── 📁 api/
│   │   └── client.ts                # Typed API client with fetch utilities
│   ├── 📁 components/               # Reusable UI components
│   │   ├── ExerciseSelector.tsx     # Exercise selection with search/filter
│   │   ├── ProfileSelector.tsx      # User profile switching
│   │   ├── Layout.tsx               # Main app layout with navigation
│   │   ├── NumberStepper.tsx        # Numeric input with +/- buttons
│   │   ├── ProgressIndicator.tsx    # Loading and progress indicators
│   │   └── Layout.tsx
│   ├── 📁 constants/
│   │   └── workout.ts               # Application constants and limits
│   ├── 📁 hooks/                    # Custom React hooks
│   ├── 📁 pages/                    # Route components (pages)
│   │   ├── Dashboard.tsx            # Main dashboard with stats
│   │   ├── ActiveWorkout.tsx        # Real-time workout logging
│   │   ├── LogPastWorkout.tsx       # Historical workout entry
│   │   ├── ExerciseLibrary.tsx      # Browse and search exercises
│   │   ├── ExerciseHistory.tsx      # Individual exercise progress
│   │   ├── WorkoutHistory.tsx       # Workout session history
│   │   ├── Stats.tsx                # Detailed analytics and charts
│   │   └── Profile.tsx              # User profile management
│   ├── 📁 store/
│   │   └── workoutStore.ts          # Zustand state management
│   ├── 📁 types/
│   │   └── index.ts                 # TypeScript type definitions
│   ├── App.tsx                      # Main app component
│   ├── main.tsx                     # React entry point
│   └── index.css                    # Global styles and Tailwind imports
│
├── 📁 server/                       # Backend Express Application
│   ├── index.ts                     # Express server setup and API routes
│   ├── database.ts                  # SQLite database configuration and helpers
│   └── seed.ts                      # Database seeding with exercise data
│
├── 📁 infrastructure/               # AWS deployment configurations
│   └── node_modules/                # Deployment dependencies
│
├── 📄 package.json                  # Project dependencies and scripts
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 vite.config.ts                # Vite build configuration
├── 📄 tailwind.config.js            # Tailwind CSS configuration
├── 📄 eslint.config.js              # ESLint configuration
├── 📄 README.md                     # Project documentation
├── 📄 workout.db                    # SQLite database file (auto-generated)
└── 📄 dist/                         # Production build output (generated)
```

## 🔗 API Endpoints

### **Authentication**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/login` | User authentication |
| `POST` | `/api/auth/set-password` | Set password for legacy users |
| `PATCH` | `/api/auth/email` | Update user email |
| `POST` | `/api/auth/change-password` | Change user password |

### **User Profiles**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profiles` | List all user profiles |
| `POST` | `/api/profiles` | Create new profile |
| `DELETE` | `/api/profiles/:id` | Delete profile |
| `GET` | `/api/user` | Get current user details |
| `PATCH` | `/api/user` | Update user information |
| `PATCH` | `/api/user/profile` | Update user profile settings |

### **Exercises**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/exercises` | List exercises with filtering (`?search=`, `?muscleGroup=`, `?equipment=`) |
| `POST` | `/api/exercises` | Create custom exercise |
| `GET` | `/api/exercises/:id/history` | Get exercise history and progress |
| `GET` | `/api/exercises/:id/previous` | Get previous session data for exercise |

### **Workouts**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workouts` | List completed workouts with pagination |
| `POST` | `/api/workouts` | Create new workout |
| `GET` | `/api/workouts/active` | Get current active workout |
| `GET` | `/api/workouts/:id` | Get detailed workout information |
| `PATCH` | `/api/workouts/:id` | Update workout (name, notes, completion) |
| `DELETE` | `/api/workouts/:id` | Delete workout |
| `DELETE` | `/api/workouts` | Clear all workouts (dangerous) |

### **Workout Sets**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/workouts/:workoutId/sets` | Add set to workout (supports cardio duration) |
| `PATCH` | `/api/sets/:id` | Update set (reps, weight, duration) |
| `DELETE` | `/api/sets/:id` | Delete set from workout |

### **Analytics & Statistics**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Dashboard overview data |
| `GET` | `/api/stats/muscle-groups` | Muscle group training distribution |
| `GET` | `/api/personal-records` | Recent personal records |

### **Data Integrity Features**
- **Atomic Transactions**: All multi-step operations use database transactions
- **Foreign Key Constraints**: Prevents orphaned records with CASCADE deletes
- **Optimistic Concurrency**: State management includes rollback on API failures
- **WAL Mode**: SQLite Write-Ahead Logging for concurrent access

## 🗄️ Database Schema

The application uses SQLite with the following key tables:

### **Core Tables**
- **`users`** - User profiles with authentication and preferences
- **`workouts`** - Workout sessions with metadata
- **`workout_sets`** - Individual sets with reps, weight, and duration
- **`exercises`** - Exercise library (pre-loaded + custom)
- **`personal_records`** - Automatic PR tracking

### **Key Features**
- **Foreign Key Constraints** with CASCADE deletes for data integrity
- **UNIQUE Constraints** prevent duplicate set numbers per exercise
- **CHECK Constraints** validate data ranges (positive weights/reps)
- **Indexes** on frequently queried columns for performance
- **WAL Mode** enabled for concurrent read/write operations

## 🚀 Deployment

### **Development**
```bash
npm run dev  # Start both frontend and backend
```

### **Production Build**
```bash
npm run build    # Build both frontend and backend
npm start        # Start production server
```

### **AWS Deployment (Configured)**
The application includes AWS deployment configurations:

- **Frontend**: S3 + CloudFront for static hosting
- **Backend**: Elastic Beanstalk for Express server
- **Database**: SQLite (file-based) or PostgreSQL (configurable)

```bash
npm run deploy:frontend  # Deploy React app to S3/CloudFront
npm run deploy:backend   # Deploy API to Elastic Beanstalk
```

### **Environment Variables**
```bash
# Database
DATABASE_PATH=/path/to/workout.db

# AWS (for deployment)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Authentication
JWT_SECRET=your-secret-key
```

## 🔒 Security Features

- **Password Hashing** - bcrypt with salt rounds
- **Input Validation** - Request validation with error handling
- **SQL Injection Protection** - Parameterized queries
- **CORS Configuration** - Proper cross-origin handling
- **Authentication System** - Secure login with session management

## 🏗️ Architecture Patterns

### **Frontend Architecture**
- **Component-Based Design** - Modular, reusable React components
- **State Management** - Zustand for predictable state updates
- **Type Safety** - Comprehensive TypeScript interfaces
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Performance** - Memoization and optimized re-renders

### **Backend Architecture**
- **RESTful API Design** - Consistent endpoint structure
- **Transaction Management** - Database transactions for data integrity
- **Error Handling** - Centralized error responses
- **Security** - Input validation and authentication
- **Performance** - Indexed queries and optimized SQL

### **Data Flow**
```
User Action → React Component → Zustand Store → API Client → Express Route → Database Transaction → Response → UI Update
```

### **Key Design Decisions**
- **SQLite for Development** - Zero-config, file-based database
- **Single Responsibility** - Each component/page has focused functionality
- **Optimistic Updates** - Immediate UI feedback with rollback capability
- **Type-First Development** - Interfaces drive implementation
- **Progressive Enhancement** - Works without JavaScript (basic functionality)

## 📈 Recent Improvements

### **Critical Fixes (Latest)**
- ✅ **Database Transactions** - All operations wrapped in transactions
- ✅ **WAL Mode Enabled** - Concurrent database access
- ✅ **Optimistic UI Updates** - State rollback on API failures
- ✅ **Foreign Key Constraints** - Data integrity with CASCADE deletes
- ✅ **Type Safety** - Comprehensive TypeScript coverage

### **New Features**
- ✅ **Cardio Exercise Support** - Duration-based tracking for cardio
- ✅ **Multiple Fitness Goals** - Select multiple objectives per profile
- ✅ **Enhanced Analytics** - Improved progress visualization
- ✅ **Better Error Handling** - Comprehensive error boundaries

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Use TypeScript for all new code
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure all linting passes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Exercise data** sourced from comprehensive fitness databases
- **Icons** provided by Lucide React
- **Charts** powered by Recharts
- **UI components** built with Tailwind CSS

---

**Built with ❤️ for the fitness community**
