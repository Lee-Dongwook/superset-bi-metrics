import { useEffect, useState, type HTMLAttributes } from "react";
import { styled } from "../../theme";
import { logging } from "../../utils";

export type BackgroundPosition = "top" | "bottom";

const ImageContainer = styled.div<{ src: string; position: BackgroundPosition }>`
  background-image: url(${({ src }) => src});
  background-size: cover;
  background-position: center ${({ position }) => position};
  display: inline-block;
  height: calc(100% - 1px);
  width: calc(100% - 2px);
  margin: 1px 1px 0 1px;
`;

interface ImageLoaderProps extends HTMLAttributes<HTMLDivElement> {
  fallback: string;
  src: string;
  isLoading?: boolean;
  position: BackgroundPosition;
}

export function ImageLoader({
  src,
  fallback,
  isLoading,
  position,
  ...rest
}: ImageLoaderProps) {
  const [imgSrc, setImgSrc] = useState(fallback);

  useEffect(() => {
    if (src) {
      fetch(src)
        .then((response) => response.blob())
        .then((blob) => {
          if (/image/.test(blob.type)) setImgSrc(URL.createObjectURL(blob));
        })
        .catch((err) => {
          logging.error(err);
          setImgSrc(fallback);
        });
    }
    // avoid flashing the stale image right before unmount
    return () => setImgSrc(fallback);
  }, [src, fallback]);

  return (
    <ImageContainer
      data-test="image-loader"
      src={isLoading ? fallback : imgSrc}
      {...rest}
      position={position}
    />
  );
}
