import { NavLink, Outlet } from 'react-router-dom';
import { Home, Dumbbell, History, BarChart3, Users, User } from 'lucide-react';

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
        <div className="grid grid-cols-6 items-center h-20 max-w-lg mx-auto px-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg transition-all duration-200 ${isActive
                ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <Home size={20} />
            <span className="text-[11px] leading-none font-medium">Home</span>
          </NavLink>

          <NavLink
            to="/workout"
            className={({ isActive }) =>
              `min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg transition-all duration-200 ${isActive
                ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <Dumbbell size={20} />
            <span className="text-[11px] leading-none font-medium">Workout</span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg transition-all duration-200 ${isActive
                ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <History size={20} />
            <span className="text-[11px] leading-none font-medium">History</span>
          </NavLink>

          <NavLink
            to="/stats"
            className={({ isActive }) =>
              `min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg transition-all duration-200 ${isActive
                ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <BarChart3 size={20} />
            <span className="text-[11px] leading-none font-medium">Stats</span>
          </NavLink>

          <NavLink
            to="/squad"
            className={({ isActive }) =>
              `min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg transition-all duration-200 ${isActive
                ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <Users size={20} />
            <span className="text-[11px] leading-none font-medium">Squad</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg transition-all duration-200 ${isActive
                ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`
            }
          >
            <User size={20} />
            <span className="text-[11px] leading-none font-medium">Profile</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
