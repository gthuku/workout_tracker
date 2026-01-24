import { NavLink, Outlet } from 'react-router-dom';
import { Home, Dumbbell, History, BarChart3, User } from 'lucide-react';

interface LayoutProps {
  onSwitchProfile?: () => void;
}

export function Layout({ onSwitchProfile }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-24">
        <Outlet context={{ onSwitchProfile }} />
      </main>

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass safe-area-pb">
        <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <Home size={22} />
            <span className="text-xs font-medium">Home</span>
          </NavLink>

          <NavLink
            to="/workout"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <Dumbbell size={22} />
            <span className="text-xs font-medium">Workout</span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <History size={22} />
            <span className="text-xs font-medium">History</span>
          </NavLink>

          <NavLink
            to="/stats"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <BarChart3 size={22} />
            <span className="text-xs font-medium">Stats</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <User size={22} />
            <span className="text-xs font-medium">Profile</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
