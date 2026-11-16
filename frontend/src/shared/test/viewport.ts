import type { Device } from '@/shared/lib/useDevice';

const widths: Record<Device, number> = { desktop: 1440, tablet: 834, mobile: 390 };

/** Fake a viewport width for useDevice. setup.ts removes the stub after each test. */
export function mockViewport(device: Device) {
  const width = widths[device];
  vi.stubGlobal('matchMedia', (query: string) => {
    const maxWidth = Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? Infinity);
    return {
      matches: width <= maxWidth,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  });
}
