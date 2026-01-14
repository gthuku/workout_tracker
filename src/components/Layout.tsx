import { NavLink, Outlet } from 'react-router-dom';
import { Home, Dumbbell, History, BarChart3, User } from 'lucide-react';

interface LayoutProps {
  onSwitchProfile?: () => void;
}

export function Layout({ onSwitchProfile }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-20">
        <Outlet context={{ onSwitchProfile }} />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 safe-area-pb">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-2 ${
                isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Home size={20} />
            <span className="text-xs">Home</span>
          </NavLink>

          <NavLink
            to="/workout"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-2 ${
                isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Dumbbell size={20} />
            <span className="text-xs">Workout</span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-2 ${
                isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <History size={20} />
            <span className="text-xs">History</span>
          </NavLink>

          <NavLink
            to="/stats"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-2 ${
                isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <BarChart3 size={20} />
            <span className="text-xs">Stats</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-2 ${
                isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <User size={20} />
            <span className="text-xs">Profile</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
