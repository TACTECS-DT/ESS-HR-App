/**
 * useRBAC — Role-Based Access Control hook
 *
 * Reads the authenticated user's role from Redux and returns
 * the full AppPermissions object for that role, plus helpers.
 *
 * @example
 *   const { canApproveLeave, canAccessAnalytics, role, isAtLeastManager } = useRBAC();
 */
import {useAppSelector} from './useAppSelector';
import {ROLE_ACCESS, UserRole, AppPermissions} from '../config/roleAccess';

export interface RBACResult extends AppPermissions {
  /** The raw role string from auth state */
  role: UserRole;
  /** manager | hr | admin */
  isAtLeastManager: boolean;
  /** hr | admin */
  isAtLeastHR: boolean;
  /** admin only */
  isAdmin: boolean;
  /** Returns true if the role can see records beyond their own employee */
  hasTeamVisibility: boolean;
}

export function useRBAC(): RBACResult {
  const rawRole = useAppSelector(state => state.auth.user?.role);
  const role: UserRole = (rawRole as UserRole) ?? 'employee';
  const permissions = ROLE_ACCESS[role];

  return {
    ...permissions,
    role,
    isAtLeastManager: role === 'manager' || role === 'hr' || role === 'admin',
    isAtLeastHR:      role === 'hr' || role === 'admin',
    isAdmin:          role === 'admin',
    hasTeamVisibility: role === 'manager' || role === 'hr' || role === 'admin',
  };
}
