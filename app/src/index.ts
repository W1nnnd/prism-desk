import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { PrismGameSystem } from './prism.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(PrismGameSystem);
});
