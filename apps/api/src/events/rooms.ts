// Salas do namespace /events.
// - `public`: eventos de monitores com isPublic=true (clientes anônimos ou logados).
// - `user:{id}`: eventos privados do dono (somente socket autenticado desse usuário).
export function publicRoom(): string {
  return 'public';
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export interface RoomTarget {
  rooms: string[];
}

// Evento privado do dono + espelho público quando o monitor é público.
export function roomsForMonitorEvent(ownerId: string, isPublic: boolean): RoomTarget {
  const rooms = [userRoom(ownerId)];
  if (isPublic) rooms.push(publicRoom());
  return { rooms };
}
