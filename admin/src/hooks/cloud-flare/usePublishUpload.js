// src/hooks/cloud-flare/usePublishUpload.js
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Uploads one or more local audio files to Cloudflare.
 * `positions` is the config array produced by PublishClipsModal:
 *   [{ position, enabled, duration, forward, reversed }, ...]
 */
export function usePublishUpload() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ files, artistId, newArtist, positions, label }) => {
      const fd = new FormData();

      const list = Array.isArray(files) ? files : [files];
      for (const f of list) fd.append('files', f);

      if (artistId)  fd.append('artistId', String(artistId));
      if (newArtist) fd.append('newArtist', JSON.stringify(newArtist));
      fd.append('positions', JSON.stringify(positions));
      if (label) fd.append('label', label);

      const r = await fetch('/api/cloudflare/tracks/publish-upload', {
        method: 'POST',
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Upload failed (${r.status})`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cloudflare-tracks'] });
      qc.invalidateQueries({ queryKey: ['cloudflare-artists'] });
    },
  });
}