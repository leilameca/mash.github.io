"use client";
import { forwardRef, useState } from "react";
import {
  MediaUploader,
  type MediaUploadHandle,
} from "../multimedia/MediaUploader";
import { MediaPicker } from "../multimedia/MediaBrowser";
import type { MediaAsset } from "@/lib/media/types";
export const ImageManager = forwardRef<
  MediaUploadHandle,
  {
    onAdd: (url: string, asset?: MediaAsset) => void;
    onBusy: (busy: boolean) => void;
    disabled: boolean;
    existingPaths?: string[];
  }
>(function ImageManager({ onAdd, onBusy, disabled, existingPaths = [] }, ref) {
  const [open, setOpen] = useState(false);
  const limit = Math.max(0, 20 - existingPaths.length);
  return (
    <div className="studio-image-manager">
      <MediaUploader
        ref={ref}
        compact
        disabled={disabled || !limit}
        maxFiles={limit}
        onAdd={onAdd}
        onBusy={onBusy}
      />
      <button
        type="button"
        className="admin-button admin-button--secondary"
        disabled={disabled || !limit}
        onClick={() => setOpen(true)}
      >
        Elegir de Multimedia
      </button>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        existingPaths={existingPaths}
        maxSelection={limit || 1}
        onSelect={(assets) =>
          assets.forEach((asset) => {
            if (asset.url) onAdd(asset.url, asset);
          })
        }
      />
    </div>
  );
});
