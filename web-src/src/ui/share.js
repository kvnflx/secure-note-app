export async function shareOrCopy(url) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'One-Time Note', text: 'A note for you', url });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
