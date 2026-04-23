import QRCode from 'qrcode-svg';

export function renderQR(root, text) {
  const qr = new QRCode({ content: text, padding: 2, ecl: 'M', width: 256, height: 256 });
  root.innerHTML = qr.svg();
}
