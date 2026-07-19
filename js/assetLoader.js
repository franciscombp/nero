export async function loadAssets() {
  const assets = {
    cat: {},
    platforms: {},
    props: {
      books: {}
    },
    svgCache: new Map()
  };

  // Cargar gato (6 poses)
  const catPoses = ['idle', 'air', 'hang', 'slide', 'sneak', 'land'];
  for (const pose of catPoses) {
    try {
      const res = await fetch(`assets/svg/cat/${pose}.svg`);
      if (res.ok) {
        assets.cat[pose] = await res.text();
      }
    } catch (e) {
      console.warn(`No se pudo cargar gato/${pose}.svg`);
    }
  }

  // Cargar plataformas (14 tipos)
  const platformTypes = [
    'floor', 'chair', 'table', 'desk', 'counter', 'sofa',
    'window', 'door', 'bed', 'dresser', 'shelf',
    'frameshelf', 'starshelf', 'top'
  ];
  for (const type of platformTypes) {
    try {
      const res = await fetch(`assets/svg/platforms/${type}.svg`);
      if (res.ok) {
        assets.platforms[type] = await res.text();
      }
    } catch (e) {
      console.warn(`No se pudo cargar platforms/${type}.svg`);
    }
  }

  // Cargar props
  try {
    const res = await fetch('assets/svg/props/yarn.svg');
    if (res.ok) {
      assets.props.yarn = await res.text();
    }
  } catch (e) {
    console.warn('No se pudo cargar props/yarn.svg');
  }

  // Cargar libros (3 colores)
  const bookColors = ['coral', 'sage', 'butter'];
  for (const color of bookColors) {
    try {
      const res = await fetch(`assets/svg/props/books/${color}.svg`);
      if (res.ok) {
        assets.props.books[color] = await res.text();
      }
    } catch (e) {
      console.warn(`No se pudo cargar props/books/${color}.svg`);
    }
  }

  return assets;
}

// Helper: Convertir SVG string a Canvas
export function svgToCanvas(svgString, width, height) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.scale(dpr, dpr);

  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.src = url;
  });
}

// Helper: Renderizar SVG en canvas
export async function drawSVG(ctx, svgString, x, y, width, height, assets) {
  if (!svgString) return false;

  try {
    const canvas = await svgToCanvas(svgString, width, height);
    ctx.drawImage(canvas, x, y);
    return true;
  } catch (e) {
    console.error('Error rendering SVG:', e);
    return false;
  }
}
