/**
 * The product form itself lives in `@agrotraders/ui` so the admin panel edits a
 * listing through the exact same fields a seller does. This module only binds
 * it to the web app's API client.
 */
import {
  GalleryEditor as BaseGalleryEditor,
  ProductForm as BaseProductForm,
  type ProductFormValues,
} from '@agrotraders/ui/ProductForm';
import { api, assetUrl } from '../../lib/api';

export {
  MAX_IMAGES,
  blankProduct,
  formToPayload,
  productFormReady,
  productToForm,
  type ProductFormValues,
  // Re-exported so the buyer's requirement form offers the SAME controls a
  // seller lists with, instead of a second set that drifts.
  AttributeFields,
  DeliverySelect,
  MarketSelect,
  SupplyCountriesSelect,
} from '@agrotraders/ui/ProductForm';

type GalleryProps = Omit<React.ComponentProps<typeof BaseGalleryEditor>, 'assetUrl' | 'upload'> & {
  /** Defaults to the seller/admin route; buyers must pass their own. */
  upload?: (files: File[]) => Promise<{ imageUrls: string[] }>;
};

export function GalleryEditor({ upload = api.products.uploadImages, ...props }: GalleryProps) {
  return <BaseGalleryEditor {...props} upload={upload} assetUrl={assetUrl} />;
}

export function ProductForm(props: {
  value: ProductFormValues;
  onChange: (next: ProductFormValues) => void;
  error?: string;
  onError: (msg: string) => void;
  /** Set once the seller has hit Save: turns every missing field red. */
  showErrors?: boolean;
}) {
  return <BaseProductForm {...props} api={api} assetUrl={assetUrl} />;
}
