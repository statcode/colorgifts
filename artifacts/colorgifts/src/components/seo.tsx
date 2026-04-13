import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

export function SEO({ title, description, image, url }: SEOProps) {
  useEffect(() => {
    document.title = title ? `${title} | ColorGifts` : "ColorGifts | Turn Memories into Coloring Books";
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Update Open Graph tags
    const updateOGTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateOGTag('og:title', title ? `${title} | ColorGifts` : "ColorGifts");
    updateOGTag('og:description', description);
    
    if (image) updateOGTag('og:image', image);
    if (url) updateOGTag('og:url', url);

  }, [title, description, image, url]);

  return null;
}
