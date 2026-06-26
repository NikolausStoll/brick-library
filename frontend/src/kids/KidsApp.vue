<template>
  <div class="kids-root">
  <section class="kids-content content-grid">
    <section class="card controls-card">
      <div class="controls-bar">
        <div class="chip-group">
          <span class="controls-label">Sort</span>
          <div class="sort-chips">
            <button
              v-for="option in sortOptions"
              :key="option.key"
              type="button"
              class="chip sort-chip"
              :class="{ active: sortField === option.key }"
              @click="setSortField(option.key)"
            >
              <span>{{ option.label }}</span>
              <span class="sort-direction">
                {{ sortField === option.key ? (sortDirection === 'asc' ? '▲' : '▼') : '' }}
              </span>
            </button>
          </div>
        </div>
        <div class="chip-group layout-switcher">
          <span class="controls-label">Layout</span>
          <div class="layout-switcher-buttons">
            <button
              type="button"
              class="chip layout-chip"
              :class="{ active: layoutMode === 'card' }"
              @click="layoutMode = 'card'"
            >Cards</button>
            <button
              type="button"
              class="chip layout-chip"
              :class="{ active: layoutMode === 'list' }"
              @click="layoutMode = 'list'"
            >List</button>
          </div>
        </div>
        <button type="button" class="chip reset-chip" @click="resetSort">Reset</button>
      </div>
    </section>

    <section v-if="sortedSets.length > 0" class="card stats-card">
      <dl class="stats-grid kids-stats-grid">
        <div>
          <dt>Total Sets</dt>
          <dd>{{ sortedSets.length }}</dd>
        </div>
        <div>
          <dt>Total Pieces</dt>
          <dd>{{ totalPieces?.toLocaleString() ?? '—' }}</dd>
        </div>
      </dl>
    </section>

    <section class="card list-card">
      <button
        v-if="isMobileLayout"
        type="button"
        class="add-set-bar-button"
        @click="openAddForm"
      >Add set</button>
      <button
        v-else
        type="button"
        class="add-button"
        aria-label="Add set"
        @click="openAddForm"
      >+</button>

      <div v-if="sortedSets.length === 0" class="empty">
        {{ sets.length === 0 ? 'No kids sets yet.' : 'No sets match the search.' }}
      </div>

      <div v-else-if="layoutMode === 'card'" class="set-grid">
        <article
          v-for="set in sortedSets"
          :key="set.id"
          class="set-card"
          @click="startEditing(set)"
        >
          <div class="set-card__layout">
            <div class="set-card__image-panel" @click.stop>
              <div v-if="getImagesForSet(set.id).length" class="set-card__image-wrapper">
                <img
                  :src="getCurrentImage(set.id)?.thumbUrl || getCurrentImage(set.id)?.url"
                  :data-fallback="getCurrentImage(set.id)?.url"
                  :alt="`Image preview for ${set.setName}`"
                  class="set-card__image"
                  loading="lazy"
                  @click="openImageViewer(set.id)"
                  @error="onImageError"
                />
                <div v-if="getImagesForSet(set.id).length > 1" class="set-card__image-controls">
                  <button
                    type="button"
                    class="carousel-button"
                    @click.stop="showPreviousImage(set.id)"
                    aria-label="Show previous image"
                  >&#8249;</button>
                  <button
                    type="button"
                    class="carousel-button"
                    @click.stop="showNextImage(set.id)"
                    aria-label="Show next image"
                  >&#8250;</button>
                </div>
                <button
                  type="button"
                  class="manage-images-gear"
                  aria-label="Manage images"
                  @click.stop="openImageManager(set.id)"
                >
                  <span class="manage-images-gear__icon">&#9881;</span>
                </button>
              </div>
              <div v-else class="set-card__image-empty">
                <span>No images yet</span>
                <button
                  type="button"
                  class="manage-images-gear"
                  aria-label="Manage images"
                  @click.stop="openImageManager(set.id)"
                >
                  <span class="manage-images-gear__icon">&#9881;</span>
                </button>
              </div>
            </div>

            <div class="set-card__details">
              <div class="set-card__header">
                <p class="set-card__manufacturer">{{ set.manufacturer }}</p>
              </div>
              <p class="set-card__name">{{ set.setName }}</p>
              <p v-if="set.setNumber" class="set-card__number">#{{ set.setNumber }}</p>
              <dl class="set-card__meta">
                <div>
                  <dt>Price</dt>
                  <dd>—</dd>
                </div>
                <div>
                  <dt>Pieces</dt>
                  <dd>{{ set.pieceCount ?? '—' }}</dd>
                </div>
                <div>
                  <dt v-if="isMobileLayout">ct/piece</dt>
                  <dt v-else>Piece Price</dt>
                  <dd>—</dd>
                </div>
                <div>
                  <dt v-if="isMobileLayout">Size</dt>
                  <dt v-else>Brick Size</dt>
                  <dd>{{ set.brickSize }}</dd>
                </div>
              </dl>
              <div v-if="set.instructionsUrl" class="set-card__chips">
                <a
                  v-if="set.instructionsUrl"
                  class="detail-chip detail-chip--instructions"
                  :href="set.instructionsUrl"
                  target="_blank"
                  rel="noopener"
                  @click.stop
                >Instructions</a>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="set-list kids-set-list" role="list">
        <div v-if="!isMobileLayout" class="set-list-header kids-set-list-header" aria-hidden="true">
          <span class="set-list-header-thumb"></span>
          <span>Name</span>
          <span>Manufacturer</span>
          <span>Set Number</span>
          <span>Pieces</span>
          <span>Brick Size</span>
        </div>
        <article
          v-for="set in sortedSets"
          :key="set.id"
          class="set-list-row kids-set-list-row"
          role="listitem"
          tabindex="0"
          @click="startEditing(set)"
          @keydown.enter="startEditing(set)"
          @keydown.space.prevent="startEditing(set)"
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
          <span class="set-list-col set-list-col--desktop">{{ set.pieceCount ?? '—' }}</span>
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
                <span>{{ set.pieceCount ?? '—' }}</span>
                <span class="set-list-line-right-sep" aria-hidden="true">·</span>
                <span>{{ set.brickSize }}</span>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

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
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
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
  'CaDA',
  'DAGAO',
  'JIE-STAR',
  'King',
  'LEGO',
  'Lezi',
  'Loz',
  'MEGA',
  'MINISO',
  'Mork',
  'Mould King',
  'Panlos',
  'QLT',
  'TGL',
  'Wange',
  'Unknown'
];

type SortField = 'setName' | 'pieceCount';

const MOBILE_BREAKPOINT = 768;
const isMobileLayout = ref(typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false);
const updateIsMobileLayout = () => {
  isMobileLayout.value = window.innerWidth <= MOBILE_BREAKPOINT;
};

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

const sortedSets = computed(() => {
  const result = sets.value.slice();
  result.sort((a, b) => {
    const direction = sortDirection.value === 'asc' ? 1 : -1;
    const aValue = a[sortField.value];
    const bValue = b[sortField.value];
    if (aValue === null || aValue === undefined) return 1 * direction;
    if (bValue === null || bValue === undefined) return -1 * direction;
    if (sortField.value === 'setName') {
      return String(aValue).localeCompare(String(bValue)) * direction;
    }
    return (Number(aValue) - Number(bValue)) * direction;
  });
  return result;
});

const totalPieces = computed(() => {
  const total = sortedSets.value.reduce((sum, set) => sum + (set.pieceCount ?? 0), 0);
  return total > 0 ? total : null;
});

const setSortField = (field: SortField) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }
  sortField.value = field;
  sortDirection.value = 'asc';
};

const resetSort = () => {
  sortField.value = 'setName';
  sortDirection.value = 'asc';
};

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
  manufacturer: '',
  setName: '',
  setNumber: '',
  pieceCount: '',
  brickSize: 'Standard',
  instructionsUrl: ''
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
  } catch (error) {
    console.error(error);
  } finally {
    imageUploading.value = false;
  }
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
  } finally {
    imageUrlUploading.value = false;
  }
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
  } finally {
    scrapeLoading.value = false;
  }
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
  } catch (error) {
    console.error(error);
  } finally {
    imageDeleting[imageId] = false;
  }
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
  } catch (error) {
    console.error(error);
  } finally {
    deletingAllImages.value = false;
  }
};

onMounted(() => {
  window.addEventListener('resize', updateIsMobileLayout);
  updateIsMobileLayout();
  loadSets();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobileLayout);
});
</script>

<style src="./kids-ui.css"></style>

<style scoped>
.kids-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
