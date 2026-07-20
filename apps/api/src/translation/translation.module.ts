import { Global, Module } from '@nestjs/common';
import { GoogleTranslateClient } from './google-translate.client';
import { TranslationService } from './translation.service';
import { TextTranslationService } from './text-translation.service';
import { ContentTranslationWorker } from './content-translation.worker';

/**
 * Machine-translation infrastructure (translate-on-write + DB cache).
 *
 * Global so any service can inject {@link TranslationService} (structured
 * translate-on-write for products/community) or {@link TextTranslationService}
 * (generic translate-on-read cache for every other free-text field) directly.
 */
@Global()
@Module({
  providers: [GoogleTranslateClient, TranslationService, TextTranslationService, ContentTranslationWorker],
  exports: [TranslationService, TextTranslationService, ContentTranslationWorker],
})
export class TranslationModule {}
