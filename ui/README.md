# Polymer Relayer Database UI

A modern React-based web interface for monitoring and managing the Polymer Relayer SQLite database.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Setup

1. **Install dependencies for both client and server:**
   ```bash
   npm run install-all
   ```

2. **Start the development environment:**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API server on `http://localhost:3001`
   - React frontend on `http://localhost:3000`

3. **Open your browser:**
   Navigate to `http://localhost:3000` to access the UI.

## 📁 Project Structure

```
ui/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── types.ts           # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   └── main.tsx           # Application entry point
├── server/                # Backend API server
│   ├── index.js           # Express server with SQLite integration
│   └── package.json       # Server dependencies
├── package.json           # Frontend dependencies & scripts
└── README.md              # This file
```

## 🔧 Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run client` - Start only the React frontend
- `npm run server` - Start only the backend API server
- `npm run build` - Build the frontend for production
- `npm run preview` - Preview the production build

## 🗄️ Database Integration

The UI automatically connects to the relayer database:

1. **Production Mode**: Looks for `relayer.db` in the parent directory
2. **Demo Mode**: Creates an in-memory database with sample data if no real database is found

## 📊 Features

### Jobs Management
- View all relayer jobs with real-time updates
- Filter by status, chain, or search terms
- Detailed job inspection with transaction data
- Status tracking (pending, executing, completed, failed)

### Chain Monitoring
- Monitor chain states and last processed blocks
- Real-time chain synchronization status

### Statistics Dashboard
- Job completion rates and status breakdown
- Event mapping statistics
- Cross-chain activity metrics

## 🔄 Real-time Updates

The UI automatically refreshes data every 5 seconds to provide real-time monitoring of relayer activity.

## 🎨 UI Components

- **JobsTable**: Displays all jobs with filtering and sorting
- **ChainStateTable**: Shows blockchain synchronization status
- **StatsCards**: Provides overview metrics and detailed statistics
- **JobDetails**: Modal for detailed job inspection

## 🛠️ Development

### Adding New Features

1. **Frontend**: Add components in `src/components/`
2. **Backend**: Extend API endpoints in `server/index.js`
3. **Types**: Update TypeScript definitions in `src/types.ts`

### Styling

The UI uses Tailwind CSS for styling with a custom design system focused on:
- Clean, professional appearance
- Responsive design for all screen sizes
- Consistent color scheme and typography
- Accessible UI components

## 🔧 Configuration

### Environment Variables

The server automatically detects the relayer database location. No additional configuration is required for basic usage.

### Custom Database Path

If you need to specify a custom database path, modify the database connection in `server/index.js`:

```javascript
db = new Database('/path/to/your/relayer.db');
```

## 🚀 Production Deployment

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Deploy the built files** from the `dist/` directory to your web server

3. **Run the backend server** in production:
   ```bash
   cd server && npm start
   ```

## 🤝 Integration with Main Relayer

This UI is designed to work alongside the main Polymer Relayer:

1. Place the `ui/` folder in your relayer project root
2. Run the relayer as normal - it will create the `relayer.db` file
3. Start the UI to monitor relayer activity in real-time

The UI is completely optional and doesn't affect relayer functionality.