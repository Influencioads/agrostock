import { Global, Module } from '@nestjs/common';
import { GoogleTranslateClient } from './google-translate.client';
import { TranslationService } from './translation.service';
import { TextTranslationService } from './text-translation.service';
import { ContentTranslationWorker } from './content-translation.worker';
import { TranslationSweepService } from './translation-sweep.service';
import { CatalogModule } from '../catalog/catalog.module';

/**
 * Machine-translation infrastructure (translate-on-write + DB cache).
 *
 * Global so any service can inject {@link TranslationService} (structured
 * translate-on-write for products/community) or {@link TextTranslationService}
 * (generic translate-on-read cache for every other free-text field) directly.
 */
@Global()
@Module({
  // For CategoriesService.fieldMap(): the worker and the sweep both need the
  // attribute definitions, which now live in the DB behind the catalog cache.
  imports: [CatalogModule],
  providers: [GoogleTranslateClient, TranslationService, TextTranslationService, ContentTranslationWorker, TranslationSweepService],
  exports: [TranslationService, TextTranslationService, ContentTranslationWorker, TranslationSweepService],
})
export class TranslationModule {}
