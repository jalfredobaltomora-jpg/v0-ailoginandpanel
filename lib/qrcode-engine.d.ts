interface QRCodeOptions {
  text: string;
  width: number;
  height: number;
  colorDark?: string;
  colorLight?: string;
  correctLevel?: number;
}

interface QRCodeConstructor {
  new (element: HTMLElement | string, options: QRCodeOptions): QRCodeInstance;
  CorrectLevel: { L: number; M: number; Q: number; H: number };
}

interface QRCodeInstance {
  makeCode(text: string): void;
  clear(): void;
}

declare const QRCode: QRCodeConstructor;
export default QRCode;
