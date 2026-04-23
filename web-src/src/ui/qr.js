import QRCode from 'qrcode-svg';

export function renderQR(root, text) {
  // Render at a higher native resolution; CSS scales it responsively.
  // padding:4 gives a proper quiet-zone so phone scanners lock on reliably.
  const qr = new QRCode({
    content: text,
    padding: 4,
    ecl: 'M',
    width: 512,
    height: 512,
    join: true,
    container: 'svg-viewbox',
  });
  root.innerHTML = qr.svg();
  const svg = root.querySelector('svg');
  if (svg) {
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
}
