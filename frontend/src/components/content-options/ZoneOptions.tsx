// https://uiwjs.github.io/react-color
import Hue from '@uiw/react-color-hue';
import Alpha from '@uiw/react-color-alpha';
import * as Icon from 'react-bootstrap-icons';

import { useEffect } from "react";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { addShapeFeatures } from '../ZoneShape';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import { useOptions, defaultOptions, serverOptions } from '../context-providers/options';
import { cleanObject } from '../../utils/utils';
import { socket } from '../../utils/socket';

export default function Zones() {
  const { options: { shape: shapeFeatures }, options, setOptions } = useOptions();

  useEffect(() => {
    setTimeout(() => {
      // Add the shape and its features when component is mounted
      const imgElement = document.querySelector('.feed') as HTMLImageElement;
      const zoneElement = document.querySelector('.zone') as HTMLDivElement;

      addShapeFeatures({ imgElement, zoneElement, shapeFeatures });
    }, 10);
  }, []);

  function removeZone() {
    serverOptions.shape = {};
    setOptions({ ...options, shape: { ...defaultOptions.shape, defaultEmpty: true } });
    socket.emit('option-update', 'shape', null);
  }

  function addZone(): void {
    serverOptions.shape = { ...shapeFeatures, defaultEmpty: undefined };
    setOptions({ ...options, shape: { ...shapeFeatures, defaultEmpty: false } });
    socket.emit('option-update', 'shape', cleanObject(shapeFeatures));

    const shapeFeaturesString = JSON.stringify({ ...shapeFeatures, defaultEmpty: undefined });
    const defaultShapeFeaturesString = JSON.stringify({ ...serverOptions?.shape, defaultEmpty: undefined });
    const zoneElement = document.querySelector('.zone') as HTMLDivElement;

    // Hide the shape if it is in the default server-side state so not to overlay
    zoneElement.classList.toggle('hidden', shapeFeaturesString === defaultShapeFeaturesString);
  }

  return (
    <div className="h-full">
      <h1>Privacy Zones</h1>
      <p>Digitally filter or cover out an area</p>
      <div className='content h-full'>
        <section className="attrs">
          <h2 className='flex place-items-center'>
            <span>Shape attributes</span>
            <HoverCard openDelay={200} closeDelay={200}>
              <HoverCardTrigger>
                <Icon.InfoCircle className='info-popup' /></HoverCardTrigger>
              <HoverCardContent>
                Transform the shape the way you want.
                <br /><br />
                Shape can be a rectangle, circle, or a square depending on the radius, width and height
                <br /><br />
                All properties are relative to the feed size
              </HoverCardContent>
            </HoverCard>
          </h2>
          <section>
            <div className="x">
              <span>x</span>
              <Slider defaultValue={[shapeFeatures.x]} max={100} step={1} className="w-[190px]" onValueChange={v => setOptions({ ...options, shape: { ...shapeFeatures, x: v[0] } })} />
            </div>
            <div className="y">
              <span>y</span>
              <Slider defaultValue={[shapeFeatures.y]} max={100} step={1} className="w-[190px]" onValueChange={v => setOptions({ ...options, shape: { ...shapeFeatures, y: v[0] } })} />
            </div>
            <div className="width">
              <span>Width</span>
              <Slider defaultValue={[shapeFeatures.width]} max={100} step={1} className="w-[190px]" onValueChange={v => setOptions({ ...options, shape: { ...shapeFeatures, width: v[0] } })} />
            </div>
            <div className="height">
              <span>Height</span>
              <Slider defaultValue={[shapeFeatures.height]} max={100} step={1} className="w-[190px]" onValueChange={v => setOptions({ ...options, shape: { ...shapeFeatures, height: v[0] } })} />
            </div>
            <div className="radius !hidden">
              <span>Radius</span>
              <Slider defaultValue={[shapeFeatures.radius]} max={100} step={1} className="w-[190px]" onValueChange={v => setOptions({ ...options, shape: { ...shapeFeatures, radius: v[0] } })} />
            </div>
          </section>
        </section>
        <section className="styles">
          <h2 className='flex place-items-center'>
            <span>Shape style</span>
            <HoverCard openDelay={200} closeDelay={200}>
              <HoverCardTrigger>
                <Icon.InfoCircle className='info-popup' /></HoverCardTrigger>
              <HoverCardContent>
                Customise the shape the way you want.
                <br /><br />
                To blur an area&mdash;just slide the opacity of the hue to 0 and update the blur the way you want.
                <br /><br />
                Final shape might not appear as previewed after saving.
              </HoverCardContent>
            </HoverCard>
          </h2>
          <section>
            <div className="opacity">
              <span>Opacity</span>
              <Alpha hsva={shapeFeatures.hsva} onChange={v => setOptions({ ...options, shape: { ...shapeFeatures, hsva: { ...shapeFeatures.hsva, a: v.a } } })} className="w-[189px]" />
            </div>
            <div className="hue">
              <span>Hue</span>
              <Hue hue={shapeFeatures.hsva.h} onChange={v => setOptions({ ...options, shape: { ...shapeFeatures, hsva: { ...shapeFeatures.hsva, h: v.h } } })} className="w-[189px]" />
            </div>
            <div className="fog">
              <span>Blur</span>
              <Slider defaultValue={[shapeFeatures.blur]} max={100} step={1} onValueChange={v => setOptions({ ...options, shape: { ...shapeFeatures, blur: v[0] } })} className="w-[189px]" />
            </div>
          </section>
        </section>
        <section className='justify-between items-end'>
          <Button className="save-button mt-[3%]" onClick={addZone}>Save</Button>
          {!options.shape.defaultEmpty && <Button variant={'ghost'} className="mt-[3%] hover:bg-transparent opacity-50 hover:opacity-100 underline transition-opacity" onClick={removeZone}>Remove zone</Button>}
        </section>
      </div>
    </div>
  )
}
