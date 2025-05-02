import { round } from "../utils/utils";
import { RefObject, useRef } from "react";
import { ShapeFeatures, serverOptions, useOptions } from "./context-providers/options";

interface PrivacyZoneShapeProps {
    feedImgRef: RefObject<HTMLImageElement>
}

interface ShapeFeaturesProps {
    imgElement: HTMLImageElement,
    zoneElement: HTMLDivElement,
    shapeFeatures: ShapeFeatures
}

export default function PrivacyZoneShape({ feedImgRef }: PrivacyZoneShapeProps) {
    const zoneShapeRef = useRef(null);
    const { options: { shape: shapeFeatures } } = useOptions();

    // Set the shape features once so the shape is displayed
    if (feedImgRef.current && zoneShapeRef.current) {
        // Get the image and rectangle elements
        const imgElement = feedImgRef.current as HTMLImageElement;
        const zoneElement = zoneShapeRef.current as HTMLDivElement;

        addShapeFeatures({ imgElement, zoneElement, shapeFeatures });
    }

    return <div className="zone hidden" ref={zoneShapeRef} />;
}

export function addShapeFeatures({ imgElement, zoneElement, shapeFeatures }: ShapeFeaturesProps) {
    if (!imgElement || !zoneElement || !shapeFeatures)
        return;

    // Get image position and size
    const feed = imgElement.getBoundingClientRect();
    const shape = zoneElement.getBoundingClientRect();
    const contentElement = document.querySelector('main') as HTMLElement;
    const alphaElement = document.querySelector('.opacity .w-color-alpha-fill') as HTMLElement;

    // Add or remove .001 to simulate change so the blur is reapplied so the box doesn't look alittle off when changing radius without changing blur (issue only in Chromium-based browsers)
    shapeFeatures.blur.toString().endsWith('.001') ? (shapeFeatures.blur -= .001) : (shapeFeatures.blur += .001);

    // Set the CSS variables
    const cssVars = {
        '--left': `${Math.max(feed.left, Math.min(feed.right - shape.width, feed.left + (feed.width * shapeFeatures.x / 100)))}px`,
        '--top': `${Math.max(feed.top, Math.min(feed.bottom - shape.height, feed.top + (feed.height * shapeFeatures.y / 100)))}px`,
        '--width': `${feed.width * shapeFeatures.width / 100}px`,
        '--height': `${feed.height * shapeFeatures.height / 100}px`,
        // '--borderRadius': `${shapeFeatures.radius}px`,
        '--alpha': `${shapeFeatures.hsva.a}`,
        '--hsla': `hsla(${shapeFeatures.hsva.h}, ${shapeFeatures.hsva.s}%, ${shapeFeatures.hsva.v}%, ${shapeFeatures.hsva.a})`,
        '--hslaNoAlpha': `hsla(${shapeFeatures.hsva.h}, ${shapeFeatures.hsva.s}%, ${shapeFeatures.hsva.v}%)`,
        '--blur': `${shapeFeatures.blur}px`
    }

    // CSS Properties to update the shape properties
    for (const [key, value] of Object.entries(cssVars))
        contentElement.style.setProperty(key, value);

    // Updating 'aria-valuenow' will keep the tooltip value in sync with the alpha value
    alphaElement.setAttribute('aria-valuenow', round(+shapeFeatures.hsva.a.toString()).toString())

    const shapeFeaturesString = JSON.stringify({ ...shapeFeatures, defaultEmpty: undefined });
    const defaultShapeFeaturesString = JSON.stringify(serverOptions?.shape);

    // Hide the shape if it is in the default server-side state so not to overlay
    zoneElement.classList.toggle('hidden', shapeFeaturesString === defaultShapeFeaturesString);
}