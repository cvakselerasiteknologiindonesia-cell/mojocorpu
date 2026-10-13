import sidebarItems from '../data/sidebar.js';

export function getRoleNames(user) {
  return (user?.roles || []).map((role) => role.name).filter(Boolean);
}

export function getSessionPermissions(session) {
  return session?.permissions || [];
}

export function hasAnyPermission(session, permissions) {
  const granted = getSessionPermissions(session);
  const needed = Array.isArray(permissions) ? permissions : [permissions];
  return needed.some((permission) => granted.includes(permission));
}

export function roleCanSeeItem(roles, item) {
  return !item.roles?.length || item.roles.some((role) => roles.includes(role));
}

export function getSidebarItems(session) {
  const roles = getRoleNames(session?.user);
  return sidebarItems
    .filter((item) => roleCanSeeItem(roles, item))
    .filter((item) => roles.includes('super-admin') || hasAnyPermission(session, item.permissions || item.permission));
}

export function isFacilitator(user) {
  const roles = getRoleNames(user);
  return roles.includes('fasilitator-internal') || roles.includes('fasilitator-eksternal');
}

export function isAdminOpd(user) {
  return getRoleNames(user).includes('admin-opd');
}
