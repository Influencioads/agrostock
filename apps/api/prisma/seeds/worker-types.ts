import type { WorkerTypeGroup } from '@prisma/client';

/**
 * The physical-labour taxonomy: what an agri-exporter actually hires between the
 * field gate and the container door.
 *
 * Data, not code — the seed upserts it and the admin screen edits the rows
 * afterwards, so adding a type never needs a deploy. Slugs are the identity and
 * must never be reused for a different job; renaming a label is safe, renaming a
 * slug orphans every rate priced against it.
 */
export interface WorkerTypeSeed {
  slug: string;
  nameEn: string;
  group: WorkerTypeGroup;
  /** Russian label. Other locales are filled by the translation cron. */
  nameRu: string;
}

export const WORKER_TYPES: WorkerTypeSeed[] = [
  // 1. Loading & material handling
  { slug: 'loader-unloader', nameEn: 'Loader / unloader', group: 'loading_handling', nameRu: 'Грузчик' },
  { slug: 'container-stuffing-crew', nameEn: 'Container stuffing & destuffing crew', group: 'loading_handling', nameRu: 'Бригада загрузки контейнеров' },
  { slug: 'forklift-operator', nameEn: 'Forklift operator', group: 'loading_handling', nameRu: 'Оператор погрузчика' },
  { slug: 'reach-stacker-operator', nameEn: 'Reach stacker / crane operator', group: 'loading_handling', nameRu: 'Оператор ричстакера / крана' },
  { slug: 'pallet-jack-operator', nameEn: 'Pallet jack operator', group: 'loading_handling', nameRu: 'Оператор паллетной тележки' },
  { slug: 'dock-worker', nameEn: 'Dock worker / stevedore', group: 'loading_handling', nameRu: 'Докер' },
  { slug: 'lashing-crew', nameEn: 'Lashing & choking crew', group: 'loading_handling', nameRu: 'Бригада крепления груза' },
  { slug: 'tally-counter', nameEn: 'Tally counter', group: 'loading_handling', nameRu: 'Тальман' },

  // 2. Packing & packhouse
  { slug: 'manual-packer', nameEn: 'Manual packer', group: 'packing', nameRu: 'Упаковщик' },
  { slug: 'bagging-operator', nameEn: 'Bagging & bag-stitching operator', group: 'packing', nameRu: 'Оператор фасовки и зашивки мешков' },
  { slug: 'vacuum-packing-operator', nameEn: 'Vacuum-packing operator', group: 'packing', nameRu: 'Оператор вакуумной упаковки' },
  { slug: 'carton-erector', nameEn: 'Carton erector', group: 'packing', nameRu: 'Сборщик коробов' },
  { slug: 'strapping-sealing-operator', nameEn: 'Strapping & sealing operator', group: 'packing', nameRu: 'Оператор обвязки и запайки' },
  { slug: 'labelling-worker', nameEn: 'Labelling & stickering worker', group: 'packing', nameRu: 'Маркировщик' },
  { slug: 'weighing-operator', nameEn: 'Weighing operator', group: 'packing', nameRu: 'Весовщик' },
  { slug: 'wrapping-operator', nameEn: 'Shrink / stretch-wrap operator', group: 'packing', nameRu: 'Оператор термо- и стретч-упаковки' },
  { slug: 'palletiser', nameEn: 'Palletiser', group: 'packing', nameRu: 'Паллетировщик' },

  // 3. Sorting & grading
  { slug: 'sorter', nameEn: 'Sorter', group: 'sorting_grading', nameRu: 'Сортировщик' },
  { slug: 'grader', nameEn: 'Grader', group: 'sorting_grading', nameRu: 'Калибровщик' },
  { slug: 'cleaner-destoner-operator', nameEn: 'Cleaner / destoner operator', group: 'sorting_grading', nameRu: 'Оператор очистки и камнеотбора' },
  { slug: 'sizing-line-worker', nameEn: 'Sizing-line worker', group: 'sorting_grading', nameRu: 'Рабочий линии калибровки' },
  { slug: 'colour-sorter-operator', nameEn: 'Colour-sorter operator', group: 'sorting_grading', nameRu: 'Оператор фотосепаратора' },
  { slug: 'trimmer', nameEn: 'Trimmer', group: 'sorting_grading', nameRu: 'Обрезчик' },
  { slug: 'deshelling-worker', nameEn: 'Deshelling / dehusking worker', group: 'sorting_grading', nameRu: 'Рабочий по очистке от скорлупы' },
  { slug: 'peeler-cutter', nameEn: 'Peeler & cutter', group: 'sorting_grading', nameRu: 'Чистильщик и резчик' },

  // 4. Processing line
  { slug: 'roasting-operator', nameEn: 'Roasting operator', group: 'processing_line', nameRu: 'Оператор обжарки' },
  { slug: 'blanching-operator', nameEn: 'Blanching operator', group: 'processing_line', nameRu: 'Оператор бланширования' },
  { slug: 'drying-operator', nameEn: 'Drying / dehydration operator', group: 'processing_line', nameRu: 'Оператор сушки' },
  { slug: 'milling-operator', nameEn: 'Milling operator', group: 'processing_line', nameRu: 'Оператор помола' },
  { slug: 'oil-expeller-operator', nameEn: 'Oil-expeller operator', group: 'processing_line', nameRu: 'Оператор маслопресса' },
  { slug: 'iqf-line-worker', nameEn: 'IQF / freezing line worker', group: 'processing_line', nameRu: 'Рабочий линии заморозки' },
  { slug: 'cold-storage-handler', nameEn: 'Cold-storage handler', group: 'processing_line', nameRu: 'Рабочий холодильного склада' },

  // 5. Warehouse & storage
  { slug: 'storeman-stacker', nameEn: 'Storeman / stacker', group: 'warehouse', nameRu: 'Кладовщик / штабелёр' },
  { slug: 'fumigation-crew', nameEn: 'Fumigation crew', group: 'warehouse', nameRu: 'Бригада фумигации' },
  { slug: 'pest-control-operator', nameEn: 'Pest-control operator', group: 'warehouse', nameRu: 'Оператор дезинсекции' },
  { slug: 'sanitation-crew', nameEn: 'Sanitation & hygiene crew', group: 'warehouse', nameRu: 'Бригада санитарной обработки' },
  { slug: 'loading-bay-helper', nameEn: 'Loading-bay helper', group: 'warehouse', nameRu: 'Помощник на погрузочной рампе' },
  { slug: 'security-guard', nameEn: 'Security guard', group: 'warehouse', nameRu: 'Охранник' },

  // 6. Transport-side
  { slug: 'truck-driver', nameEn: 'Truck driver', group: 'transport', nameRu: 'Водитель грузовика' },
  { slug: 'driver-helper', nameEn: "Driver's helper / cleaner", group: 'transport', nameRu: 'Помощник водителя' },
  { slug: 'reefer-technician', nameEn: 'Reefer technician', group: 'transport', nameRu: 'Техник рефрижератора' },
  { slug: 'weighbridge-operator', nameEn: 'Weighbridge operator', group: 'transport', nameRu: 'Оператор весовой' },
  { slug: 'dispatch-helper', nameEn: 'Dispatch helper', group: 'transport', nameRu: 'Помощник по отгрузке' },

  // 7. Field-to-gate & sampling
  { slug: 'harvest-gang', nameEn: 'Harvest gang', group: 'field_to_gate', nameRu: 'Уборочная бригада' },
  { slug: 'mandi-market-handler', nameEn: 'Mandi / market handler', group: 'field_to_gate', nameRu: 'Рабочий оптового рынка' },
  { slug: 'sampler', nameEn: 'Sampler', group: 'field_to_gate', nameRu: 'Пробоотборщик' },
  { slug: 'crate-bin-handler', nameEn: 'Crate & bin handler', group: 'field_to_gate', nameRu: 'Рабочий по таре' },
];

/** Display order of the groups, coarse-to-fine along the export chain. */
export const WORKER_TYPE_GROUPS: WorkerTypeGroup[] = [
  'loading_handling',
  'packing',
  'sorting_grading',
  'processing_line',
  'warehouse',
  'transport',
  'field_to_gate',
];
