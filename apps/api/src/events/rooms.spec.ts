import { publicRoom, roomsForMonitorEvent, userRoom } from './rooms';

describe('event rooms', () => {
  it('sends private events only to the owner room', () => {
    expect(roomsForMonitorEvent('u1', false)).toEqual({ rooms: ['user:u1'] });
  });

  it('mirrors public monitor events to the public room', () => {
    expect(roomsForMonitorEvent('u1', true)).toEqual({ rooms: ['user:u1', publicRoom()] });
  });

  it('builds user rooms', () => {
    expect(userRoom('u1')).toBe('user:u1');
  });
});
