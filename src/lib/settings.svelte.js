import { api } from './api.js';

function createSettings() {
  let inputVolume = $state(1.0);
  let sendVolume = $state(1.0);
  let notificationVolume = $state(1.0);
  let masterVolume = $state(1.0);
  let loaded = $state(false);

  return {
    get inputVolume() { return inputVolume; },
    set inputVolume(v) { inputVolume = v; },
    get sendVolume() { return sendVolume; },
    set sendVolume(v) { sendVolume = v; },
    get notificationVolume() { return notificationVolume; },
    set notificationVolume(v) { notificationVolume = v; },
    get masterVolume() { return masterVolume; },
    set masterVolume(v) { masterVolume = v; },
    get loaded() { return loaded; },

    async load() {
      const data = await api.get('/api/settings/sound');
      inputVolume = data.inputVolume ?? 1.0;
      sendVolume = data.sendVolume ?? 1.0;
      notificationVolume = data.notificationVolume ?? 1.0;
      masterVolume = data.masterVolume ?? 1.0;
      loaded = true;
    },

    async save() {
      await api.put('/api/settings/sound', { inputVolume, sendVolume, notificationVolume, masterVolume });
    }
  };
}

export const settings = createSettings();
