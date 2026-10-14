import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export function QrCode({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { margin: 1, width: 480 }).then((dataUrl) => {
      if (!cancelled) setDataUrl(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return dataUrl && <img className="qr" src={dataUrl} alt="QR code linking to this poll" />
}
