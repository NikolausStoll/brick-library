<template>
  <div class="kids-root">
  <section class="kids-content content-grid">

    <!-- Mobile: search + sort row -->
    <div v-if="isMobileLayout" class="mobile-top-bar">
      <div class="mobile-search-wrap">
        <input
          v-model="searchQuery"
          type="search"
          class="mobile-search-input"
          placeholder="Search sets…"
          autocomplete="off"
        />
        <span class="mobile-search-icon" aria-hidden="true">&#128269;</span>
      </div>
      <div class="kids-sort-anchor" ref="mobileSortRef">
        <button
          type="button"
          class="mobile-filter-btn"
          :class="{ active: sortField !== 'setName' || sortDirection !== 'asc' }"
          @click="mobileSortOpen = !mobileSortOpen"
        >
          Sort {{ sortDirection === 'asc' ? '↑' : '↓' }}
        </button>
        <div v-if="mobileSortOpen" class="kids-sort-panel">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            type="button"
            class="kids-sort-option"
            :class="{ active: sortField === option.key }"
            @click="setSortField(option.key); mobileSortOpen = false"
          >
            {{ option.label }}<span v-if="sortField === option.key"> {{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile: summary + layout switcher -->
    <div v-if="isMobileLayout" class="mobile-summary-bar">
      <span class="mobile-summary-text">
        {{ displayedSets.length }} Sets<template v-if="totalPieces !== null"> · {{ totalPieces.toLocaleString() }} Steine</template>
      </span>
      <div class="mobile-layout-switcher">
        <button type="button" class="mobile-layout-btn" :class="{ active: layoutMode === 'card' }" @click="layoutMode = 'card'" aria-label="Gallery view">&#9638;</button>
        <button type="button" class="mobile-layout-btn" :class="{ active: layoutMode === 'list' }" @click="layoutMode = 'list'" aria-label="List view">&#8801;</button>
      </div>
    </div>

    <!-- Desktop toolbar -->
    <div v-if="!isMobileLayout" class="desktop-toolbar">
      <div class="toolbar-search-wrap">
        <span class="toolbar-search-icon" aria-hidden="true">&#128269;</span>
        <input
          v-model="searchQuery"
          type="search"
          class="toolbar-search-input"
          placeholder="Search sets…"
          autocomplete="off"
        />
      </div>
      <div class="kids-sort-anchor" ref="sortPopoverRef">
        <button
          type="button"
          class="toolbar-btn toolbar-sort-btn"
          @click="desktopSortPanelOpen = !desktopSortPanelOpen"
        >
          Sort: {{ currentSortLabel }}&thinsp;<span class="sort-dir-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
        </button>
        <div v-if="desktopSortPanelOpen" class="kids-sort-panel">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            type="button"
            class="kids-sort-option"
            :class="{ active: sortField === option.key }"
            @click="setSortField(option.key); desktopSortPanelOpen = false"
          >
            {{ option.label }}<span v-if="sortField === option.key" class="sort-dir-arrow"> {{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
          </button>
        </div>
      </div>
      <div class="toolbar-layout-switcher">
        <button type="button" class="toolbar-layout-btn" :class="{ active: layoutMode === 'card' }" @click="layoutMode = 'card'" aria-label="Gallery view">&#9638;</button>
        <button type="button" class="toolbar-layout-btn" :class="{ active: layoutMode === 'list' }" @click="layoutMode = 'list'" aria-label="List view">&#8801;</button>
      </div>
      <button type="button" class="toolbar-add-btn" @click="openAddForm">+ Add Set</button>
    </div>

    <!-- Desktop compact stats row -->
    <div v-if="!isMobileLayout && displayedSets.length > 0" class="desktop-stats-row">
      <span>{{ displayedSets.length }} Sets</span>
      <template v-if="totalPieces !== null">
        <span class="desktop-stats-sep">·</span>
        <span>{{ totalPieces.toLocaleString() }} pieces</span>
      </template>
    </div>

    <section class="card list-card">
      <div v-if="displayedSets.length === 0" class="empty">
        {{ sets.length === 0 ? 'No kids sets yet.' : 'No sets match the search.' }}
      </div>

      <template v-else-if="layoutMode === 'card'">
        <!-- Mobile gallery -->
        <div v-if="isMobileLayout" class="mobile-gallery-grid">
          <button
            v-for="set in displayedSets"
            :key="set.id"
            type="button"
            class="mobile-gallery-item"
            @click="openMobileDetail(set)"
          >
            <div class="mobile-gallery-img-wrap">
              <img
                v-if="getCurrentImage(set.id)"
                :src="getCurrentImage(set.id)!.thumbUrl || getCurrentImage(set.id)!.url"
                :data-fallback="getCurrentImage(set.id)!.url"
                :alt="set.setName"
                class="mobile-gallery-img"
                loading="lazy"
                @error="onImageError"
              />
              <div v-else class="mobile-gallery-img-empty"></div>
            </div>
            <p class="mobile-gallery-name">{{ set.setName }}</p>
          </button>
        </div>

        <!-- Desktop gallery -->
        <div v-else class="set-grid">
          <article
            v-for="set in displayedSets"
            :key="set.id"
            class="set-card"
            @click="startEditing(set)"
          >
            <div class="set-card__image-panel" @click.stop>
              <div v-if="getImagesForSet(set.id).length" class="set-card__image-wrapper">
                <img
                  :src="getCurrentImage(set.id)?.thumbUrl || getCurrentImage(set.id)?.url"
                  :data-fallback="getCurrentImage(set.id)?.url"
                  :alt="set.setName"
                  class="set-card__image"
                  loading="lazy"
                  @click="openImageViewer(set.id)"
                  @error="onImageError"
                />
                <div v-if="getImagesForSet(set.id).length > 1" class="set-card__image-controls">
                  <button type="button" class="carousel-button" @click.stop="showPreviousImage(set.id)" aria-label="Show previous image">&#8249;</button>
                  <button type="button" class="carousel-button" @click.stop="showNextImage(set.id)" aria-label="Show next image">&#8250;</button>
                </div>
                <button type="button" class="manage-images-gear" aria-label="Manage images" @click.stop="openImageManager(set.id)">
                  <span class="manage-images-gear__icon">&#9881;</span>
                </button>
              </div>
              <div v-else class="set-card__image-empty">
                <span>No images yet</span>
                <button type="button" class="manage-images-gear" aria-label="Manage images" @click.stop="openImageManager(set.id)">
                  <span class="manage-images-gear__icon">&#9881;</span>
                </button>
              </div>
            </div>
            <div class="set-card__details">
              <p class="set-card__name">{{ set.setName }}</p>
              <p class="set-card__secondary">
                <span class="set-card__manufacturer">{{ set.manufacturer }}</span>
                <template v-if="set.setNumber">
                  <span class="set-card__secondary-sep" aria-hidden="true"> · </span>
                  <span class="set-card__number">#{{ set.setNumber }}</span>
                </template>
              </p>
              <div class="set-card__data-row" v-if="set.pieceCount !== null">
                <span class="set-card__data-item">{{ set.pieceCount?.toLocaleString() ?? '—' }}<span class="set-card__data-unit"> pcs</span></span>
                <template v-if="set.brickSize">
                  <span class="set-card__data-sep" aria-hidden="true">·</span>
                  <span class="set-card__data-item">{{ set.brickSize }}</span>
                </template>
              </div>
              <div v-if="set.instructionsUrl" class="set-card__chips">
                <a class="detail-chip detail-chip--instructions" :href="set.instructionsUrl" target="_blank" rel="noopener" @click.stop>Instructions</a>
              </div>
            </div>
          </article>
        </div>
      </template>

      <div v-else-if="layoutMode === 'list'" class="set-list kids-set-list" role="list">
        <div v-if="!isMobileLayout" class="set-list-header kids-set-list-header" aria-hidden="true">
          <span class="set-list-header-thumb"></span>
          <span>Name</span>
          <span>Mfr.</span>
          <span>Set #</span>
          <span>Pieces</span>
          <span>Size</span>
        </div>
        <article
          v-for="set in displayedSets"
          :key="set.id"
          class="set-list-row kids-set-list-row"
          role="listitem"
          tabindex="0"
          @click="isMobileLayout ? openMobileDetail(set) : startEditing(set)"
          @keydown.enter="isMobileLayout ? openMobileDetail(set) : startEditing(set)"
          @keydown.space.prevent="isMobileLayout ? openMobileDetail(set) : startEditing(set)"
        >
          <div class="set-list-thumb" @click.stop="onListThumbClick(set)">
            <img
              v-if="getListThumbForSet(set.id)"
              :src="getListThumbForSet(set.id)!"
              :data-fallback="getCurrentImage(set.id)?.url"
              :alt="`Thumbnail for ${set.setName}`"
              loading="lazy"
              @error="onImageError"
            />
            <span v-else class="set-list-thumb-empty" aria-hidden="true">—</span>
          </div>
          <span class="set-list-col set-list-col--name set-list-col--desktop">{{ set.setName }}</span>
          <span class="set-list-col set-list-col--mfr set-list-col--desktop">{{ set.manufacturer }}</span>
          <span class="set-list-col set-list-col--desktop">{{ set.setNumber ?? '—' }}</span>
          <span class="set-list-col set-list-col--desktop">{{ set.pieceCount?.toLocaleString() ?? '—' }}</span>
          <span class="set-list-col set-list-col--desktop">{{ set.brickSize }}</span>
          <div class="set-list-mobile-lines">
            <div class="set-list-line set-list-line--primary">
              <span class="set-list-name">{{ set.setName }}</span>
            </div>
            <div class="set-list-line set-list-line--secondary">
              <div class="set-list-line-left">
                <span class="set-list-manufacturer">{{ set.manufacturer }}</span>
                <template v-if="set.setNumber">
                  <span class="set-list-line-left-sep" aria-hidden="true">·</span>
                  <span class="set-card__number set-list-set-number">#{{ set.setNumber }}</span>
                </template>
              </div>
              <span class="set-list-line-right">
                <span>{{ set.pieceCount?.toLocaleString() ?? '—' }}</span>
                <span class="set-list-line-right-sep" aria-hidden="true">·</span>
                <span>{{ set.brickSize }}</span>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Mobile FAB -->
    <button v-if="isMobileLayout" type="button" class="mobile-fab" @click="openAddForm" aria-label="Add set">+</button>

    <!-- Mobile detail sheet -->
    <div
      v-if="mobileDetailSet"
      class="overlay mobile-detail-overlay"
      role="dialog"
      aria-modal="true"
      @click.self="closeMobileDetail"
      @keydown.esc="closeMobileDetail"
      tabindex="-1"
    >
      <div class="mobile-detail-sheet">
        <div class="mobile-detail-handle"></div>
        <div class="mobile-detail-top">
          <div class="mobile-detail-top-actions">
            <button type="button" class="icon-button" aria-label="Edit set" @click="openMobileDetailEdit">&#9998;</button>
            <button type="button" class="icon-button" aria-label="Close" @click="closeMobileDetail">&times;</button>
          </div>
        </div>
        <div v-if="getImagesForSet(mobileDetailSet!.id).length" class="mobile-detail-image-area">
          <img
            :src="getCurrentImage(mobileDetailSet!.id)!.thumbUrl || getCurrentImage(mobileDetailSet!.id)!.url"
            :data-fallback="getCurrentImage(mobileDetailSet!.id)!.url"
            :alt="mobileDetailSet!.setName"
            class="mobile-detail-main-image"
            @click="openImageViewer(mobileDetailSet!.id)"
            @error="onImageError"
          />
          <button type="button" class="manage-images-gear mobile-detail-img-gear" aria-label="Manage images" @click.stop="openMobileDetailImages">
            <span class="manage-images-gear__icon">&#9881;</span>
          </button>
        </div>
        <div v-else class="mobile-detail-image-empty">
          <button type="button" class="manage-images-gear mobile-detail-img-gear mobile-detail-img-gear--empty" aria-label="Add images" @click.stop="openMobileDetailImages">
            <span class="manage-images-gear__icon">&#9881;</span>
          </button>
          No images
        </div>
        <div class="mobile-detail-body">
          <h2 class="mobile-detail-name">{{ mobileDetailSet!.setName }}</h2>
          <p class="mobile-detail-manufacturer">{{ mobileDetailSet!.manufacturer }}</p>
          <p v-if="mobileDetailSet!.setNumber" class="set-card__number">#{{ mobileDetailSet!.setNumber }}</p>
          <dl class="mobile-detail-meta">
            <div v-if="mobileDetailSet!.pieceCount !== null">
              <dt>Pieces</dt>
              <dd>{{ mobileDetailSet!.pieceCount!.toLocaleString() }}</dd>
            </div>
            <div v-if="mobileDetailSet!.brickSize">
              <dt>Size</dt>
              <dd>{{ mobileDetailSet!.brickSize }}</dd>
            </div>
          </dl>
          <div v-if="mobileDetailSet!.instructionsUrl" class="set-card__chips">
            <a class="detail-chip detail-chip--instructions" :href="mobileDetailSet!.instructionsUrl" target="_blank" rel="noopener" @click.stop>Instructions</a>
          </div>
          <div class="mobile-detail-actions">
            <button type="button" class="primary-button mobile-detail-edit-btn" @click="openMobileDetailEdit">Edit Set</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Form overlay -->
    <div
      v-if="isFormOverlayVisible"
      class="overlay"
      role="dialog"
      aria-modal="true"
      @click.self="closeFormOverlay"
      @keydown.esc="closeFormOverlay"
      tabindex="-1"
      ref="formOverlayRef"
    >
      <form class="card form-card overlay-card" @submit.prevent="saveSet">
        <div class="overlay-header">
          <h2>{{ isEditing ? 'Edit set' : 'Add a set' }}</h2>
          <button type="button" class="icon-button" aria-label="Close" @click="closeFormOverlay">&times;</button>
        </div>
        <div class="form-grid">
          <label>
            Manufacturer
            <input
              v-model="form.manufacturer"
              type="text"
              required
              list="kids-manufacturer-options"
              placeholder="LEGO"
            />
            <datalist id="kids-manufacturer-options">
              <option v-for="manufacturer in manufacturers" :key="manufacturer" :value="manufacturer" />
            </datalist>
          </label>
          <label>
            Set name
            <input v-model="form.setName" type="text" required placeholder="Police Station" />
          </label>
          <label>
            Set number
            <input v-model="form.setNumber" type="text" placeholder="60316" />
          </label>
          <label>
            Brick size
            <select v-model="form.brickSize">
              <option v-for="size in brickSizes" :key="size" :value="size">{{ size }}</option>
            </select>
          </label>
          <label>
            Piece count
            <input v-model="form.pieceCount" type="number" min="0" placeholder="540" />
          </label>
          <label class="full-width">
            Instructions URL
            <input v-model="form.instructionsUrl" type="url" placeholder="https://..." />
          </label>
        </div>
        <div v-if="isEditing" class="form-actions-row">
          <button type="submit" class="primary-button" :disabled="submitting">
            {{ submitting ? 'Saving…' : 'Update set' }}
          </button>
          <button
            type="button"
            class="delete-set-button"
            :class="{ confirming: deleteSetConfirming }"
            :disabled="deletingSet"
            @click="deleteSet"
          >
            {{ deletingSet ? 'Deleting…' : deleteSetConfirming ? 'Are you sure?' : 'Delete set' }}
          </button>
        </div>
        <button v-else type="submit" class="primary-button" :disabled="submitting">
          {{ submitting ? 'Saving…' : 'Add set' }}
        </button>
      </form>
    </div>

    <!-- Image viewer overlay -->
    <div v-if="imageViewerSetId !== null" class="image-viewer-overlay" @click.self="closeImageViewer">
      <div class="image-viewer-content">
        <button type="button" class="icon-button image-viewer-close" @click="closeImageViewer">&times;</button>
        <button
          v-if="getImagesForSet(imageViewerSetId).length > 1"
          type="button"
          class="carousel-button image-viewer-nav image-viewer-prev"
          @click.stop="showPreviousViewerImage"
        >&#8249;</button>
        <img :src="imageViewerUrl" alt="Fullscreen preview" class="image-viewer-img" />
        <button
          v-if="getImagesForSet(imageViewerSetId).length > 1"
          type="button"
          class="carousel-button image-viewer-nav image-viewer-next"
          @click.stop="showNextViewerImage"
        >&#8250;</button>
      </div>
    </div>

    <!-- Image manager overlay -->
    <div v-if="imageManagerSetId !== null" class="overlay" role="dialog" aria-modal="true" @click.self="closeImageManager">
      <div class="card overlay-card image-manager-card">
        <div class="overlay-header">
          <h2>Manage images</h2>
          <button type="button" class="icon-button" @click="closeImageManager">&times;</button>
        </div>

        <div class="upload-tabs">
          <button type="button" :class="{ active: uploadMode === 'file' }" @click="uploadMode = 'file'">File</button>
          <button type="button" :class="{ active: uploadMode === 'url' }" @click="uploadMode = 'url'">URL</button>
          <button type="button" :class="{ active: uploadMode === 'html' }" @click="uploadMode = 'html'">HTML</button>
        </div>

        <form v-if="uploadMode === 'file'" class="upload-panel" @submit.prevent="uploadImages">
          <label class="image-upload-input">
            <span>{{ selectedFileLabel }}</span>
            <input :key="uploadInputResetKey" type="file" accept="image/*" multiple @change="handleImageSelection" />
          </label>
          <button type="submit" class="primary-button" :disabled="!pendingFiles.length || imageUploading">
            {{ imageUploading ? 'Uploading…' : 'Upload' }}
          </button>
        </form>

        <form v-else-if="uploadMode === 'url'" class="upload-panel" @submit.prevent="uploadImageFromUrl">
          <input v-model="imageUrlInput" type="url" placeholder="https://example.com/image.jpg" required />
          <button type="submit" class="primary-button" :disabled="imageUrlUploading">
            {{ imageUrlUploading ? 'Downloading…' : 'Download' }}
          </button>
          <div v-if="imageUrlError" class="upload-error">{{ imageUrlError }}</div>
        </form>

        <form v-else class="upload-panel" @submit.prevent="scrapeImages">
          <label>
            HTML containing &lt;img&gt; tags
            <textarea v-model="scrapeForm.rawHtml" rows="4" required></textarea>
          </label>
          <label>
            Base URL <span class="label-hint">(optional)</span>
            <input v-model="scrapeForm.baseUrl" type="url" placeholder="https://example.com" />
          </label>
          <button type="submit" class="primary-button" :disabled="scrapeLoading">
            {{ scrapeLoading ? 'Scraping…' : 'Scrape' }}
          </button>
          <div v-if="scrapeResult" class="upload-success">
            Found {{ scrapeResult.found }}, downloaded {{ scrapeResult.downloaded }}, skipped {{ scrapeResult.skipped }}
          </div>
          <div v-if="scrapeError" class="upload-error">{{ scrapeError }}</div>
        </form>

        <div v-if="getImagesForSet(imageManagerSetId).length" class="image-manager-list">
          <div v-for="(image, index) in getImagesForSet(imageManagerSetId)" :key="image.id" class="image-manager-item">
            <img :src="image.thumbUrl || image.url" :data-fallback="image.url" :alt="image.fileName" @error="onImageError" />
            <div class="image-manager-item-info">
              <span class="image-manager-item-meta">{{ formatImageDimensions(image) }}</span>
              <span class="image-manager-item-meta">{{ formatFileSize(image.fileSize) }}</span>
            </div>
            <div class="image-manager-item-actions">
              <div class="image-manager-sort-buttons">
                <button type="button" class="image-sort-button" :disabled="index === 0" @click="moveImage(index, index - 1)">&#9650;</button>
                <button
                  type="button"
                  class="image-sort-button"
                  :disabled="index === getImagesForSet(imageManagerSetId).length - 1"
                  @click="moveImage(index, index + 1)"
                >&#9660;</button>
              </div>
              <button type="button" class="image-manager-delete" :disabled="imageDeleting[image.id]" @click="deleteImage(image.id)">
                {{ imageDeleting[image.id] ? '…' : 'Delete' }}
              </button>
            </div>
          </div>
          <button
            type="button"
            class="delete-all-button"
            :class="{ confirming: deleteAllConfirming }"
            :disabled="deletingAllImages"
            @click="deleteAllImages"
          >
            {{ deletingAllImages ? 'Deleting…' : deleteAllConfirming ? 'Are you sure?' : 'Delete all images' }}
          </button>
        </div>
        <p v-else class="image-gallery-empty">No images uploaded yet.</p>
      </div>
    </div>
  </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import {
  addKidsImageFromUrl,
  createKidsSet,
  deleteAllKidsImages,
  deleteKidsImage,
  deleteKidsSet,
  fetchKidsSetImages,
  fetchKidsSets,
  reorderKidsImages,
  scrapeKidsImages,
  updateKidsSet,
  uploadKidsImages
} from './kidsApi';
import type { KidsFormPayload, KidsSet, KidsSetImage } from './types';

const brickSizes = ['Diamond', 'Mini', 'Standard'];
const manufacturers = [
  'CaDA', 'DAGAO', 'JIE-STAR', 'King', 'LEGO', 'Lezi', 'Loz', 'MEGA',
  'MINISO', 'Mork', 'Mould King', 'Panlos', 'QLT', 'TGL', 'Wange', 'Unknown'
];

type SortField = 'setName' | 'pieceCount';

const MOBILE_BREAKPOINT = 768;
const isMobileLayout = ref(typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false);
const updateIsMobileLayout = () => { isMobileLayout.value = window.innerWidth <= MOBILE_BREAKPOINT; };

const sets = ref<KidsSet[]>([]);
const setImages = reactive<Record<string, KidsSetImage[]>>({});
const setImageIndexes = reactive<Record<string, number>>({});

const layoutMode = ref<'card' | 'list'>('card');
const sortField = ref<SortField>('setName');
const sortDirection = ref<'asc' | 'desc'>('asc');
const sortOptions: Array<{ key: SortField; label: string }> = [
  { key: 'setName', label: 'Name' },
  { key: 'pieceCount', label: 'Pieces' }
];

const searchQuery = ref('');
const mobileSortOpen = ref(false);
const desktopSortPanelOpen = ref(false);
const mobileSortRef = ref<HTMLElement | null>(null);
const sortPopoverRef = ref<HTMLElement | null>(null);
const mobileDetailSetId = ref<string | null>(null);

const sortedSets = computed(() => {
  const result = sets.value.slice();
  result.sort((a, b) => {
    const direction = sortDirection.value === 'asc' ? 1 : -1;
    const aValue = a[sortField.value];
    const bValue = b[sortField.value];
    if (aValue === null || aValue === undefined) return 1 * direction;
    if (bValue === null || bValue === undefined) return -1 * direction;
    if (sortField.value === 'setName') return String(aValue).localeCompare(String(bValue)) * direction;
    return (Number(aValue) - Number(bValue)) * direction;
  });
  return result;
});

const displayedSets = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return sortedSets.value;
  return sortedSets.value.filter((s) =>
    s.setName.toLowerCase().includes(q) ||
    (s.setNumber?.toLowerCase().includes(q) ?? false) ||
    s.manufacturer.toLowerCase().includes(q)
  );
});

const totalPieces = computed(() => {
  const total = displayedSets.value.reduce((sum, set) => sum + (set.pieceCount ?? 0), 0);
  return total > 0 ? total : null;
});

const currentSortLabel = computed(() =>
  sortOptions.find((o) => o.key === sortField.value)?.label ?? String(sortField.value)
);

const mobileDetailSet = computed(() =>
  mobileDetailSetId.value ? sets.value.find((s) => s.id === mobileDetailSetId.value) ?? null : null
);

const setSortField = (field: SortField) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }
  sortField.value = field;
  sortDirection.value = 'asc';
};

const openMobileDetail = (set: KidsSet) => { mobileDetailSetId.value = set.id; };
const closeMobileDetail = () => { mobileDetailSetId.value = null; };
const openMobileDetailEdit = () => {
  const set = mobileDetailSet.value;
  if (!set) return;
  closeMobileDetail();
  startEditing(set);
};
const openMobileDetailImages = () => {
  const set = mobileDetailSet.value;
  if (!set) return;
  closeMobileDetail();
  openImageManager(set.id);
};

const handleOutsideClick = (event: MouseEvent) => {
  if (mobileSortRef.value && !mobileSortRef.value.contains(event.target as Node)) {
    mobileSortOpen.value = false;
  }
  if (sortPopoverRef.value && !sortPopoverRef.value.contains(event.target as Node)) {
    desktopSortPanelOpen.value = false;
  }
};

watch([mobileSortOpen, desktopSortPanelOpen], ([m, d]) => {
  if (m || d) document.addEventListener('mousedown', handleOutsideClick);
  else document.removeEventListener('mousedown', handleOutsideClick);
});

const getImagesForSet = (setId: string) => setImages[setId] ?? [];
const getImageIndex = (setId: string) => {
  const images = getImagesForSet(setId);
  if (images.length === 0) return 0;
  return (setImageIndexes[setId] ?? 0) % images.length;
};
const getCurrentImage = (setId: string) => {
  const images = getImagesForSet(setId);
  return images.length > 0 ? images[getImageIndex(setId)] : null;
};
const getListThumbForSet = (setId: string) => {
  const image = getCurrentImage(setId);
  return image ? image.thumbUrl || image.url : null;
};

const showNextImage = (setId: string) => {
  const images = getImagesForSet(setId);
  if (images.length < 2) return;
  setImageIndexes[setId] = ((setImageIndexes[setId] ?? 0) + 1) % images.length;
};
const showPreviousImage = (setId: string) => {
  const images = getImagesForSet(setId);
  if (images.length < 2) return;
  setImageIndexes[setId] = ((setImageIndexes[setId] ?? 0) - 1 + images.length) % images.length;
};

const onListThumbClick = (set: KidsSet) => {
  if (getImagesForSet(set.id).length) openImageViewer(set.id);
  else openImageManager(set.id);
};

const onImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  const fallback = target.dataset.fallback;
  if (fallback) target.src = fallback;
};

const formatImageDimensions = (image: KidsSetImage) => {
  if (image.imageWidth && image.imageHeight) return `${image.imageWidth}×${image.imageHeight}px`;
  return '—';
};
const formatFileSize = (value: number | null) => {
  if (value == null) return '—';
  return `${Math.round(value / 1024)} KB`;
};

const loadSets = async () => {
  sets.value = await fetchKidsSets();
  await Promise.all(sets.value.map((set) => refreshImages(set.id)));
};

const refreshImages = async (setId: string) => {
  setImages[setId] = await fetchKidsSetImages(setId);
};

const createEmptyForm = (): KidsFormPayload => ({
  manufacturer: '', setName: '', setNumber: '', pieceCount: '', brickSize: 'Standard', instructionsUrl: ''
});
const form = ref<KidsFormPayload>(createEmptyForm());
const editingId = ref<string | null>(null);
const isEditing = computed(() => Boolean(editingId.value));
const isFormOverlayVisible = ref(false);
const formOverlayRef = ref<HTMLElement | null>(null);
const submitting = ref(false);

const openAddForm = () => {
  editingId.value = null;
  form.value = createEmptyForm();
  isFormOverlayVisible.value = true;
  nextTick(() => formOverlayRef.value?.focus());
};

const startEditing = (set: KidsSet) => {
  editingId.value = set.id;
  form.value = {
    manufacturer: set.manufacturer,
    setName: set.setName,
    setNumber: set.setNumber ?? '',
    pieceCount: set.pieceCount != null ? String(set.pieceCount) : '',
    brickSize: set.brickSize ?? 'Standard',
    instructionsUrl: set.instructionsUrl ?? ''
  };
  isFormOverlayVisible.value = true;
  nextTick(() => formOverlayRef.value?.focus());
};

const closeFormOverlay = () => {
  editingId.value = null;
  form.value = createEmptyForm();
  isFormOverlayVisible.value = false;
  deleteSetConfirming.value = false;
};

const saveSet = async () => {
  if (!form.value.manufacturer.trim() || !form.value.setName.trim()) return;
  submitting.value = true;
  try {
    const payload = {
      manufacturer: form.value.manufacturer.trim(),
      setName: form.value.setName.trim(),
      setNumber: form.value.setNumber.trim() || null,
      pieceCount: form.value.pieceCount === '' ? null : Number(form.value.pieceCount),
      brickSize: brickSizes.includes(form.value.brickSize) ? form.value.brickSize : 'Standard',
      instructionsUrl: form.value.instructionsUrl.trim() || null
    };
    if (editingId.value) await updateKidsSet(editingId.value, payload);
    else await createKidsSet(payload);
    await loadSets();
    closeFormOverlay();
  } catch (error) {
    console.error(error);
  } finally {
    submitting.value = false;
  }
};

const deletingSet = ref(false);
const deleteSetConfirming = ref(false);
let deleteSetTimer: ReturnType<typeof setTimeout> | null = null;

const deleteSet = async () => {
  if (!editingId.value) return;
  if (!deleteSetConfirming.value) {
    deleteSetConfirming.value = true;
    deleteSetTimer = setTimeout(() => { deleteSetConfirming.value = false; }, 4000);
    return;
  }
  if (deleteSetTimer) { clearTimeout(deleteSetTimer); deleteSetTimer = null; }
  deleteSetConfirming.value = false;
  deletingSet.value = true;
  try {
    await deleteKidsSet(editingId.value);
    closeFormOverlay();
    await loadSets();
  } catch (error) {
    console.error(error);
  } finally {
    deletingSet.value = false;
  }
};

const imageViewerSetId = ref<string | null>(null);
const imageViewerIndex = ref(0);
const imageViewerUrl = computed(() => {
  const setId = imageViewerSetId.value;
  if (setId === null) return undefined;
  const images = getImagesForSet(setId);
  return images[imageViewerIndex.value % images.length]?.url;
});
const openImageViewer = (setId: string) => {
  imageViewerSetId.value = setId;
  imageViewerIndex.value = getImageIndex(setId);
};
const closeImageViewer = () => { imageViewerSetId.value = null; };
const showNextViewerImage = () => {
  const setId = imageViewerSetId.value;
  if (!setId) return;
  const images = getImagesForSet(setId);
  if (images.length < 2) return;
  imageViewerIndex.value = (imageViewerIndex.value + 1) % images.length;
};
const showPreviousViewerImage = () => {
  const setId = imageViewerSetId.value;
  if (!setId) return;
  const images = getImagesForSet(setId);
  if (images.length < 2) return;
  imageViewerIndex.value = (imageViewerIndex.value - 1 + images.length) % images.length;
};

const imageManagerSetId = ref<string | null>(null);
const uploadMode = ref<'file' | 'url' | 'html'>('file');
const pendingFiles = ref<File[]>([]);
const uploadInputResetKey = ref(0);
const imageUploading = ref(false);
const imageUrlInput = ref('');
const imageUrlUploading = ref(false);
const imageUrlError = ref<string | null>(null);
const scrapeForm = reactive({ rawHtml: '', baseUrl: '' });
const scrapeLoading = ref(false);
const scrapeResult = ref<{ found: number; downloaded: number; skipped: number } | null>(null);
const scrapeError = ref<string | null>(null);
const imageDeleting = reactive<Record<string, boolean>>({});
const deletingAllImages = ref(false);
const deleteAllConfirming = ref(false);
let deleteAllTimer: ReturnType<typeof setTimeout> | null = null;

const selectedFileLabel = computed(() => {
  if (pendingFiles.value.length === 0) return 'Choose files';
  if (pendingFiles.value.length === 1) return pendingFiles.value[0].name;
  return `${pendingFiles.value.length} files selected`;
});

const openImageManager = (setId: string) => {
  imageManagerSetId.value = setId;
  pendingFiles.value = [];
  imageUrlInput.value = '';
  imageUrlError.value = null;
  scrapeResult.value = null;
  scrapeError.value = null;
};
const closeImageManager = () => { imageManagerSetId.value = null; };

const handleImageSelection = (event: Event) => {
  const target = event.target as HTMLInputElement;
  pendingFiles.value = target.files ? Array.from(target.files) : [];
};

const uploadImages = async () => {
  if (!imageManagerSetId.value || !pendingFiles.value.length) return;
  imageUploading.value = true;
  try {
    await uploadKidsImages(imageManagerSetId.value, pendingFiles.value);
    pendingFiles.value = [];
    uploadInputResetKey.value += 1;
    await refreshImages(imageManagerSetId.value);
  } catch (error) { console.error(error); }
  finally { imageUploading.value = false; }
};

const uploadImageFromUrl = async () => {
  if (!imageManagerSetId.value) return;
  imageUrlError.value = null;
  imageUrlUploading.value = true;
  try {
    await addKidsImageFromUrl(imageManagerSetId.value, imageUrlInput.value);
    imageUrlInput.value = '';
    await refreshImages(imageManagerSetId.value);
  } catch (error) {
    imageUrlError.value = error instanceof Error ? error.message : 'Upload failed';
  } finally { imageUrlUploading.value = false; }
};

const scrapeImages = async () => {
  if (!imageManagerSetId.value) return;
  scrapeResult.value = null;
  scrapeError.value = null;
  scrapeLoading.value = true;
  try {
    const result = await scrapeKidsImages(imageManagerSetId.value, {
      rawHtml: scrapeForm.rawHtml,
      baseUrl: scrapeForm.baseUrl || undefined
    });
    scrapeResult.value = result;
    if (result.downloaded > 0) await refreshImages(imageManagerSetId.value);
  } catch (error) {
    scrapeError.value = error instanceof Error ? error.message : 'Scrape failed';
  } finally { scrapeLoading.value = false; }
};

const moveImage = async (fromIndex: number, toIndex: number) => {
  if (!imageManagerSetId.value) return;
  const images = getImagesForSet(imageManagerSetId.value);
  if (toIndex < 0 || toIndex >= images.length) return;
  const reordered = [...images];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  setImages[imageManagerSetId.value] = reordered;
  try {
    setImages[imageManagerSetId.value] = await reorderKidsImages(
      imageManagerSetId.value,
      reordered.map((img) => img.id)
    );
  } catch (error) {
    console.error(error);
    await refreshImages(imageManagerSetId.value);
  }
};

const deleteImage = async (imageId: string) => {
  if (!imageManagerSetId.value) return;
  imageDeleting[imageId] = true;
  try {
    await deleteKidsImage(imageManagerSetId.value, imageId);
    await refreshImages(imageManagerSetId.value);
  } catch (error) { console.error(error); }
  finally { imageDeleting[imageId] = false; }
};

const deleteAllImages = async () => {
  if (!imageManagerSetId.value) return;
  if (!deleteAllConfirming.value) {
    deleteAllConfirming.value = true;
    deleteAllTimer = setTimeout(() => { deleteAllConfirming.value = false; }, 3000);
    return;
  }
  if (deleteAllTimer) { clearTimeout(deleteAllTimer); deleteAllTimer = null; }
  deleteAllConfirming.value = false;
  deletingAllImages.value = true;
  try {
    await deleteAllKidsImages(imageManagerSetId.value);
    await refreshImages(imageManagerSetId.value);
  } catch (error) { console.error(error); }
  finally { deletingAllImages.value = false; }
};

onMounted(() => {
  window.addEventListener('resize', updateIsMobileLayout);
  updateIsMobileLayout();
  loadSets();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobileLayout);
  document.removeEventListener('mousedown', handleOutsideClick);
});
</script>

<style src="./kids-ui.css"></style>

<style scoped>
.kids-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Kids-specific list grid ── */
.kids-set-list-header,
.kids-set-list-row { grid-template-columns: 52px 2fr 0.8fr 0.8fr 0.75fr 0.75fr; }

/* ── Shared toolbar / stats / mobile elements ─────────────── */

/* Hide desktop-only elements on mobile */
.desktop-toolbar,
.desktop-stats-row {
  display: none;
}

/* Hide mobile-only elements by default */
.mobile-top-bar,
.mobile-summary-bar,
.mobile-fab,
.mobile-gallery-grid {
  display: none;
}

/* ── Mobile ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .list-card {
    background: transparent;
    box-shadow: none;
    border: none;
    padding: 0;
  }

  .mobile-top-bar {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0 0.1rem;
  }

  .mobile-search-wrap {
    flex: 1;
    position: relative;
  }

  .mobile-search-input {
    width: 100%;
    padding: 0.6rem 2.4rem 0.6rem 0.85rem;
    border-radius: 999px;
    border: 1px solid var(--border-input);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.9rem;
    outline: none;
    box-sizing: border-box;
    -webkit-appearance: none;
    appearance: none;
  }

  .mobile-search-input:focus { border-color: var(--accent); }

  .mobile-search-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8rem;
    color: var(--text-muted);
    pointer-events: none;
  }

  .mobile-filter-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.6rem 0.9rem;
    border-radius: 999px;
    border: 1px solid var(--border-input);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .mobile-filter-btn.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
  }

  .mobile-summary-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.25rem;
  }

  .mobile-summary-text {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .mobile-layout-switcher {
    display: flex;
    gap: 0.2rem;
  }

  .mobile-layout-btn {
    width: 2rem;
    height: 2rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-tertiary);
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .mobile-layout-btn.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
  }

  .mobile-gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.45rem;
  }

  .mobile-gallery-item {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    border-radius: 0.5rem;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-gallery-img-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    background: var(--bg-inset);
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid var(--border-light);
  }

  .mobile-gallery-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .mobile-gallery-img-empty {
    width: 100%;
    height: 100%;
    background: var(--bg-inset);
  }

  .mobile-gallery-name {
    margin: 0;
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--text-primary);
    padding: 0 0.1rem 0.15rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.3;
  }

  .mobile-fab {
    position: fixed;
    bottom: 3.5rem;
    right: 0.75rem;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    border: none;
    background: var(--accent);
    color: #fff;
    font-size: 1.6rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    z-index: 20;
    -webkit-tap-highlight-color: transparent;
  }
}

/* ── Mobile detail sheet ──────────────────────────────── */
.mobile-detail-overlay {
  align-items: flex-end;
  padding: 0;
}

.mobile-detail-sheet {
  width: 100%;
  max-height: 92vh;
  background: var(--bg-card);
  border-radius: 1.25rem 1.25rem 0 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.mobile-detail-handle {
  width: 2.5rem;
  height: 0.25rem;
  background: var(--border-medium);
  border-radius: 999px;
  margin: 0.75rem auto 0.25rem;
  flex-shrink: 0;
}

.mobile-detail-top {
  display: flex;
  justify-content: flex-end;
  padding: 0.25rem 1rem 0.85rem;
}

.mobile-detail-top-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.mobile-detail-image-area {
  width: 100%;
  max-height: 50vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-inset);
  overflow: hidden;
  position: relative;
}

.mobile-detail-main-image {
  width: 100%;
  max-height: 50vw;
  object-fit: contain;
  cursor: zoom-in;
}

.mobile-detail-img-gear {
  opacity: 1 !important;
}

.mobile-detail-img-gear--empty {
  position: static;
  margin-bottom: 0.5rem;
}

.mobile-detail-image-empty {
  width: 100%;
  padding: 1.5rem 2rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  background: var(--bg-inset);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.mobile-detail-body {
  padding: 1rem 1.25rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-detail-name {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.mobile-detail-manufacturer {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.mobile-detail-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin: 0.15rem 0;
  padding: 0.75rem;
  background: var(--bg-elevated);
  border-radius: 0.75rem;
  border: 1px solid var(--border-light);
}

.mobile-detail-meta dt {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 0.1rem;
}

.mobile-detail-meta dd {
  margin: 0;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.mobile-detail-actions { margin-top: 0.5rem; }

.mobile-detail-edit-btn {
  width: 100%;
  padding: 0.8rem;
  font-size: 0.95rem;
  border-radius: 0.9rem;
}

/* ── Sort popover (both mobile + desktop) ─────────────── */
.kids-sort-anchor {
  position: relative;
  flex-shrink: 0;
}

.kids-sort-panel {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  z-index: 100;
  background: var(--bg-card);
  border: 1px solid var(--border-medium);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-card);
  min-width: 140px;
  padding: 0.4rem;
}

.kids-sort-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.45rem;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.kids-sort-option:hover { background: var(--bg-inset); }

.kids-sort-option.active {
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
}

/* ── Desktop ─────────────────────────────────────────────── */
@media (min-width: 769px) {
  .list-card {
    background: transparent;
    box-shadow: none;
    border: none;
    padding: 0;
  }

  .desktop-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-card);
    border-radius: 0.75rem;
    box-shadow: var(--shadow-card);
  }

  .toolbar-search-wrap {
    flex: 1;
    position: relative;
    min-width: 0;
  }

  .toolbar-search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8rem;
    color: var(--text-muted);
    pointer-events: none;
  }

  .toolbar-search-input {
    width: 100%;
    padding: 0.45rem 0.75rem 0.45rem 2.1rem;
    border-radius: 999px;
    border: 1px solid var(--border-input);
    background: var(--bg-inset);
    color: var(--text-primary);
    font-size: 0.85rem;
    outline: none;
    box-sizing: border-box;
    -webkit-appearance: none;
    appearance: none;
    transition: border-color 0.15s;
  }

  .toolbar-search-input:focus {
    border-color: var(--accent);
    background: var(--bg-surface);
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    border: 1px solid var(--border-medium);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, border-color 0.15s;
  }

  .toolbar-btn:hover { background: var(--bg-elevated); }

  .toolbar-sort-btn { font-weight: 500; }

  .sort-dir-arrow {
    font-size: 0.85em;
    color: var(--text-secondary);
  }

  .toolbar-layout-switcher {
    display: flex;
    border: 1px solid var(--border-medium);
    border-radius: 0.5rem;
    overflow: hidden;
    flex-shrink: 0;
  }

  .toolbar-layout-btn {
    width: 2.1rem;
    height: 2.1rem;
    border: none;
    background: var(--bg-surface);
    color: var(--text-tertiary);
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .toolbar-layout-btn + .toolbar-layout-btn {
    border-left: 1px solid var(--border-medium);
  }

  .toolbar-layout-btn.active {
    background: var(--accent-soft);
    color: var(--accent);
  }

  .toolbar-add-btn {
    flex-shrink: 0;
    padding: 0.45rem 1rem;
    border-radius: 999px;
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .toolbar-add-btn:hover {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .desktop-stats-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0 0.25rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .desktop-stats-sep { color: var(--text-muted); }

  /* Desktop card: vertical layout */
  .set-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.85rem;
  }

  .set-card {
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .set-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.14);
  }

  .set-card__image-panel {
    width: 100%;
  }

  .set-card__image-wrapper {
    width: 100%;
    height: auto;
    aspect-ratio: 4 / 3;
  }

  .set-card__image-empty {
    aspect-ratio: 4 / 3;
    height: auto;
  }

  .set-card__details {
    margin-left: 0;
    padding: 0.65rem 0.75rem 0.7rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .set-card__name {
    font-size: 0.88rem;
    margin: 0;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .set-card__secondary {
    margin: 0;
    font-size: 0.72rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .set-card__secondary-sep {
    color: var(--text-muted);
    margin: 0 0.1rem;
  }

  .set-card__data-row {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    margin-top: 0.25rem;
    flex-wrap: wrap;
  }

  .set-card__data-item {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .set-card__data-unit {
    font-size: 0.65rem;
    font-weight: 400;
    color: var(--text-muted);
  }

  .set-card__data-sep {
    color: var(--text-muted);
    font-size: 0.7rem;
  }
}

@media (min-width: 1200px) {
  .set-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (min-width: 1650px) {
  .set-grid { grid-template-columns: repeat(5, 1fr); }
}
</style>
