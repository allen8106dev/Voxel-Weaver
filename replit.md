# VoxelCraft - 3D Hand-Tracking Builder

## Overview

VoxelCraft is a web-based 3D voxel building application that uses real-time hand tracking to enable users to create voxel structures through intuitive hand gestures. The application uses webcam input to detect hand movements and translates them into 3D building actions within a Three.js-powered scene.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **3D Rendering**: Three.js for WebGL-based voxel scene rendering

### Hand Tracking System
- **MediaPipe Hands**: Google's MediaPipe library for real-time hand landmark detection
- **Camera Utils**: MediaPipe camera utilities for webcam stream handling
- **Gesture Recognition**: Custom gesture processing that converts hand landmarks into actionable gestures (pinch detection, palm position/rotation)
- **Architecture Pattern**: Custom React hook (`useHandTracking`) encapsulates MediaPipe initialization and provides gesture state to components

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Development**: Vite dev server with HMR for frontend, tsx for TypeScript execution
- **Production Build**: esbuild bundles server code, Vite builds client assets

### Data Storage
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts` contains database table definitions
- **Current Implementation**: In-memory storage (`MemStorage` class) for development
- **Database Ready**: Drizzle configuration prepared for PostgreSQL when DATABASE_URL is provided

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/   # React components including VoxelBuilder
│   │   ├── hooks/        # Custom hooks (hand tracking, toast, mobile detection)
│   │   ├── lib/          # Utilities (voxel scene, gesture recognition, hand tracking)
│   │   └── pages/        # Route pages
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route registration
│   ├── storage.ts    # Data storage interface
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared code between client and server
│   └── schema.ts     # Drizzle database schema
```

## External Dependencies

### Hand Tracking & Computer Vision
- **@mediapipe/hands**: Hand landmark detection model
- **@mediapipe/camera_utils**: Webcam stream utilities

### 3D Graphics
- **three**: WebGL-based 3D scene rendering for voxel display

### Database
- **drizzle-orm**: TypeScript ORM for database operations
- **drizzle-kit**: Database migration and schema management tools
- **pg**: PostgreSQL client (used when DATABASE_URL is configured)

### UI Framework
- **@radix-ui/***: Accessible UI primitives (dialog, dropdown, tooltip, etc.)
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant styling
- **lucide-react**: Icon library

### Server Dependencies
- **express**: Web server framework
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Build & Development
- **vite**: Frontend build tool and dev server
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development