// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Entry for the story page. The text and the scroll timeline start at once;
// the WebGL stage is loaded after first paint, only if the browser can run
// it, so the words never wait for the pictures.

import { $, whenIdle } from '../core/dom.ts';
import { initPage } from '../core/ui.ts';
import { Story } from '../story/story.ts';

initPage();

const root = $('[data-story]');
if (root) {
  const story = new Story(root);
  const canvas = $<HTMLCanvasElement>('[data-gl]', root);
  const stageEl = $('[data-stage]', root);

  const supportsGL = (): boolean => {
    try {
      const probe = document.createElement('canvas');
      return !!probe.getContext('webgl2');
    } catch {
      return false;
    }
  };

  const start = async () => {
    if (!canvas || !stageEl || !supportsGL()) return;
    try {
      const { createStoryStage } = await import('../stage/story-stage.ts');
      const stage = createStoryStage(canvas);
      if (!stage) return;
      story.attach(stage);
      stageEl.setAttribute('data-gl-ready', '');
      // Stop rendering when the stage has scrolled out of view.
      new IntersectionObserver(([entry]) => stage.setActive(!!entry?.isIntersecting), { rootMargin: '10% 0px' }).observe(stageEl);
    } catch (error) {
      if (__DEV__) console.error(error);
    }
  };

  if (document.readyState === 'complete') whenIdle(() => void start());
  else window.addEventListener('load', () => whenIdle(() => void start()), { once: true });
}
