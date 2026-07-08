import {
  buildKillFeedEvent,
  resetKillStreaks,
  formatKillChatLine
} from '../../../src/combat/killFeed.js';

describe('killFeed', () => {
  beforeEach(() => {
    resetKillStreaks();
  });

  test('tracks killer streak and victim streak end', () => {
    const killer = { username: 'you', isLocal: true };
    const victim = { username: 'bot', isBot: true };

    const first = buildKillFeedEvent(killer, victim);
    expect(first.killerStreak).toBe(1);
    expect(first.victimEndedStreak).toBe(0);

    const second = buildKillFeedEvent(killer, { username: 'other' });
    expect(second.killerStreak).toBe(2);
    expect(formatKillChatLine(second)).toContain('2 streak');
  });

  test('resets victim streak on death', () => {
    const player = { username: 'ace' };
    buildKillFeedEvent(player, { username: 'a' });
    buildKillFeedEvent(player, { username: 'b' });

    const ended = buildKillFeedEvent({ username: 'rival' }, player);
    expect(ended.victimEndedStreak).toBe(2);
    expect(formatKillChatLine(ended)).toContain("ended ace's 2 streak");
  });
});
