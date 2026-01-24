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
- **Profile Pictures** - Upload and display custom avatar images
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
| **Redis** | Keep frequently accessed data in memory (via `ioredis`) |
| **Zod** | TypeScript-first schema validation |
| **bcrypt** | Password hashing for authentication |
| **Pino** | Fast, low-overhead logger |
| **Helmet** | Security headers middleware |
| **Rate Limit** | Rate limiting for API protection |
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
- **SQLite** with WAL mode for concurrent read/write operations
- **Redis Caching** for high-performance data retrieval
- **Transaction-based operations** for data integrity
- **Foreign key constraints** with CASCADE deletes
- **Automatic schema migrations** via custom migration runner

## 📋 Prerequisites

### **Required**
- **Node.js 20+** - JavaScript runtime environment
- **Redis** - For caching layer (optional for dev, but recommended)
- **SQLite** - Included automatically

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Database Setup

**SQLite (Default and Only Supported Database)**
- No setup required! SQLite database is created automatically
- Database file: `workout.db` (created in project root)
- Schema and seed data initialize automatically on first server start
- Includes WAL mode for concurrent access and performance optimizations

### 3. Environment Configuration (Optional)

Override default settings with environment variables:

```bash
# Database & Cache
export DATABASE_PATH=./workout.db
export REDIS_URL=redis://localhost:6379

# Server
export PORT=3001
export NODE_ENV=development
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
| `npm run dev` | Start both frontend (port 5173) and backend (port 3001) concurrently |
| `npm run dev:client` | Start frontend only (Vite dev server) |
| `npm run dev:server` | Start backend only (Express with watch) |

### **Database**
| Command | Description |
|---------|-------------|
| `npm run migrate` | Run pending migrations |
| `npm run migrate:status` | Check migration status |
| `npm run migrate:create` | Create a new migration file |
| `npm run migrate:rollback` | Rollback last batch of migrations |

### **Production**
| Command | Description |
|---------|-------------|
| `npm run build` | Full production build (Client + Server) |
| `npm run build:server` | Build server TypeScript only |
| `npm run build:client` | Build client (React) only |
| `npm start` | Start production server |
| `npm run preview` | Preview production build locally |

### **Quality & Maintenance**
| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint for code quality checks |
| `npm run typecheck` | Run TypeScript type checking |

## 📁 Project Structure

```
├── 📁 src/                          # Frontend React Application
│   ├── 📁 api/                      # Typed API client
│   ├── 📁 components/               # Reusable UI components
│   ├── 📁 pages/                    # Route components
│   ├── 📁 store/                    # Zustand state management
│   ├── 📁 types/                    # Shared TypeScript types
│   └── index.css                    # Tailwind imports
│
├── 📁 server/                       # Backend Express Application
│   ├── 📁 middleware/               # Express middleware (auth, error, logging)
│   ├── 📁 migrations/               # Database migration scripts
│   ├── 📁 schemas/                  # Zod validation schemas
│   ├── 📁 services/                 # Business logic layer
│   ├── 📁 utils/                    # Utilities (cache, logger)
│   ├── index.ts                     # Entry point
│   └── database.ts                  # Database configuration
│
├── 📄 package.json                  # Dependencies and scripts
├── 📄 tsconfig.json                 # Shared TypeScript config
├── 📄 workout.db                    # SQLite database
└── 📄 dist/                         # Production build output
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
| `PATCH` | `/api/user` | Update user preferences |
| `PUT` | `/api/user/profile` | Update full user profile (including avatar) |

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
| `DELETE` | `/api/workouts/incomplete` | Clean up incomplete/abandoned workouts |

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
- **`users`** - User profiles with authentication, preferences, and avatar
- **`workouts`** - Workout sessions with metadata
- **`workout_sets`** - Individual sets with reps, weight, and duration
- **`exercises`** - Exercise library (pre-loaded + custom)
- **`personal_records`** - Automatic PR tracking (max weight, max volume)

### **Key Features**
- **Foreign Key Constraints** with CASCADE deletes for data integrity
- **UNIQUE Constraints** prevent duplicate set numbers per exercise
- **CHECK Constraints** validate data ranges (positive weights/reps)
- **Indexes** on frequently queried columns for performance
- **WAL Mode** enabled for concurrent read/write operations
- **Automatic Cleanup** removes incomplete workouts older than 24 hours

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

### **Environment Variables**
```bash
# Database (optional - defaults to ./workout.db)
DATABASE_PATH=/path/to/custom/workout.db

# Server
PORT=3001
NODE_ENV=production
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
User Action → React Component → Zustand Store → API Client → Express Route → Zod Validation → Service Layer → Database Transaction → Response → UI Update
```

### **Key Design Decisions**
- **SQLite for Development** - Zero-config, file-based database
- **Single Responsibility** - Each component/page has focused functionality
- **Optimistic Updates** - Immediate UI feedback with rollback capability
- **Type-First Development** - Interfaces drive implementation
- **Progressive Enhancement** - Works without JavaScript (basic functionality)

## 📈 Recent Improvements

### **Critical Fixes (Latest)**
- ✅ **Database Transactions** - All multi-step operations wrapped in atomic transactions
- ✅ **WAL Mode Enabled** - Concurrent database access with Write-Ahead Logging
- ✅ **Optimistic UI Updates** - State rollback on API failures
- ✅ **Foreign Key Constraints** - Data integrity with CASCADE deletes
- ✅ **Request Validation** - Server-side validation for all inputs (reps, weight, exercises)
- ✅ **Type Safety** - Comprehensive TypeScript coverage end-to-end

### **New Features**
- ✅ **Profile Pictures** - Upload and display avatar images (base64 storage)
- ✅ **Cardio Exercise Support** - Duration-based tracking for cardio exercises
- ✅ **Multiple Fitness Goals** - Select multiple objectives per profile
- ✅ **Enhanced Analytics** - Improved progress visualization
- ✅ **Better Error Handling** - Comprehensive error boundaries
- ✅ **Body Part Filtering** - Dropdown to filter exercises by major body parts
- ✅ **Automatic Cleanup** - Server automatically removes old incomplete workouts

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
