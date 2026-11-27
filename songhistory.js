/*
 * Zuletzt gespielte Songs über OpenScrBridge.songHistory.
 * Keine DOM-Abhängigkeit. Im klassischen Script: globalThis.OpenScrSongHistory.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OpenScrSongHistory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SELECT_AT = 4;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function hasApi(bridge) {
    const api = bridge && bridge.songHistory;
    return Boolean(api
      && typeof api.add === 'function'
      && typeof api.list === 'function'
      && typeof api.sources === 'function');
  }

  function playKey(track) {
    const uri = clean(track && track.uri);
    if (uri) return 'uri:' + uri;
    return 'ta:' + clean(track && track.title).toLowerCase() + '\n' + clean(track && track.artist).toLowerCase();
  }

  function addPayload(track) {
    const title = clean(track && (track.title || track.name));
    if (!title) return null;
    const artist = clean(track && track.artist);
    const payload = { title: title };
    if (artist) payload.artist = artist;
    return payload;
  }

  function shouldRecord(track, noted) {
    const payload = addPayload(track);
    if (!payload) return null;
    const key = playKey(track);
    if (noted && noted[key]) return null;
    return { key: key, payload: payload };
  }

  function markRecorded(noted, key) {
    if (noted && key) noted[key] = true;
  }

  function searchQuery(entry) {
    const title = clean(entry && entry.title);
    const artist = clean(entry && entry.artist);
    if (!title) return '';
    return artist ? title + ' ' + artist : title;
  }

  function groupSources(sources, songsBySource) {
    const groups = [];
    (sources || []).forEach(function (row) {
      if (!row || row.source == null || row.source === '') return;
      const songs = (songsBySource && songsBySource[row.source]) || [];
      const entries = [];
      songs.forEach(function (entry) {
        if (entry && clean(entry.title)) entries.push(entry);
      });
      if (!entries.length) return;
      groups.push({
        source: row.source,
        sourceName: clean(row.sourceName) || String(row.source),
        songs: entries
      });
    });
    return groups;
  }

  function presentation(groups) {
    const list = groups || [];
    if (!list.length) return { mode: 'hidden', groups: [] };
    if (list.length >= SELECT_AT) return { mode: 'select', groups: list };
    return { mode: 'buttons', groups: list };
  }

  function showPanel(hasBridge) {
    return Boolean(hasBridge);
  }

  return {
    SELECT_AT: SELECT_AT,
    hasApi: hasApi,
    shouldRecord: shouldRecord,
    markRecorded: markRecorded,
    searchQuery: searchQuery,
    groupSources: groupSources,
    presentation: presentation,
    showPanel: showPanel
  };
});
