<template>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">Brick Library</p>
    </section>

  <section class="content-grid">
    <section class="card controls-card">
      <div class="controls-bar">
        <div class="chip-group">
          <span class="controls-label">Filter</span>
          <div class="chip filter-chip">
            <span>{{ filters.manufacturer || 'Manufacturer' }}</span>
            <select v-model="filters.manufacturer">
              <option value="">All</option>
              <option v-for="manufacturer in manufacturers" :key="manufacturer" :value="manufacturer">
                {{ manufacturer }}
              </option>
            </select>
          </div>
          <div class="chip filter-chip">
            <span>{{ filters.status || 'Status' }}</span>
            <select v-model="filters.status">
              <option value="">All</option>
              <option v-for="status in statuses" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </div>
          <div class="chip filter-chip">
            <span>{{ filters.brickSize || 'Brick size' }}</span>
            <select v-model="filters.brickSize">
              <option value="">All</option>
              <option v-for="size in brickSizes" :key="size" :value="size">
                {{ size }}
              </option>
            </select>
          </div>
        </div>
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
            <button type="button" class="chip reset-chip" @click="resetFilters">
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
    <section class="card list-card">
      <div class="list-header">
          <div class="list-header__title">
            <h2>Collection</h2>
            <span class="count">{{ filteredSets.length }} sets</span>
          </div>
        <button type="button" class="primary-button" @click="openAddForm">
          Add a set
        </button>
      </div>
      <div v-if="filteredSets.length === 0" class="empty">
        {{ sets.length === 0 ? 'No sets yet. Add one to start tracking your library.' : 'No sets match the active filters.' }}
      </div>
      <div v-else class="set-grid">
        <article
          v-for="set in filteredSets"
          :key="set.id"
          class="set-card"
          @click="startEditing(set)"
        >
          <div class="set-card__layout">
            <div class="set-card__image-panel" @click.stop>
              <div v-if="getImagesForSet(set.id).length" class="set-card__image-wrapper">
                <img
                  :src="getCurrentImage(set.id)?.url"
                  :alt="`Image preview for ${set.setName}`"
                  class="set-card__image"
                  loading="lazy"
                  @click="openImageViewer(set.id)"
                />
                <div class="set-card__image-controls" v-if="getImagesForSet(set.id).length > 1">
                  <button
                    type="button"
                    class="carousel-button"
                    @click.stop="showPreviousImage(set.id)"
                    aria-label="Show previous image"
                  >
                    &#8249;
                  </button>
                  <button
                    type="button"
                    class="carousel-button"
                    @click.stop="showNextImage(set.id)"
                    aria-label="Show next image"
                  >
                    &#8250;
                  </button>
                </div>
                <button
                  type="button"
                  class="manage-images-gear"
                  aria-label="Manage images"
                  @click.stop="openImageManager(set.id)"
                >
                  &#9881;
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
                  &#9881;
                </button>
              </div>
            </div>

            <div class="set-card__details">
              <div class="set-card__header">
                <p class="set-card__manufacturer">{{ set.manufacturer }}</p>
                <p class="set-card__status">{{ set.status }}</p>
              </div>
              <p class="set-card__name">{{ set.setName }}</p>
          <p class="set-card__number" v-if="set.setNumber || set.legoReferenceNumber">
            {{ formatSetNumber(set) }}
          </p>
              <dl class="set-card__meta">
                <div>
                  <dt>Price</dt>
                  <dd>{{ formatPrice(set.purchasePrice) }}</dd>
                </div>
                <div>
                  <dt>Pieces</dt>
                  <dd>{{ set.pieceCount ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Price per piece</dt>
                  <dd>{{ formatCents(set.pricePerPiece) }}</dd>
                </div>
                <div>
                  <dt>Brick size</dt>
                  <dd>{{ set.brickSize }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </article>
      </div>
    </section>
  </section>

  <div
    v-if="isFormOverlayVisible"
    class="overlay"
    role="dialog"
    aria-modal="true"
    @click.self="closeFormOverlay"
  >
    <form class="card form-card overlay-card" @submit.prevent="saveSet">
      <div class="overlay-header">
        <h2>{{ isEditing ? 'Edit set' : 'Add a set' }}</h2>
        <button
          type="button"
          class="icon-button"
          aria-label="Close form"
          @click="closeFormOverlay"
        >
          &times;
        </button>
      </div>
      <div class="form-grid">
        <label>
          Manufacturer
          <input
            v-model="form.manufacturer"
            type="text"
            required
            list="manufacturer-options"
            placeholder="LEGO"
          />
          <datalist id="manufacturer-options">
            <option v-for="manufacturer in manufacturers" :key="manufacturer" :value="manufacturer" />
          </datalist>
        </label>
        <label>
          Set name
          <input v-model="form.setName" type="text" required placeholder="Millennium Falcon" />
        </label>
        <label>
          Set number
          <input v-model="form.setNumber" type="text" placeholder="75192" />
        </label>
        <label>
          LEGO reference number
          <input v-model="form.legoReferenceNumber" type="text" placeholder="21348" />
        </label>
        <label>
          Status
          <select v-model="form.status">
            <option v-for="status in statuses" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </label>
        <label>
          Brick size
          <select v-model="form.brickSize">
            <option v-for="size in brickSizes" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </label>
        <label>
          Purchase price (EUR)
          <input
            v-model="form.purchasePrice"
            type="text"
            inputmode="decimal"
            placeholder="199,99"
            @input="handleDecimalInput('purchasePrice', $event.target.value)"
          />
        </label>
        <label>
          Piece count
          <input v-model="form.pieceCount" type="number" min="0" placeholder="7541" />
        </label>
      </div>
      <button type="submit" :disabled="submitting">{{ isEditing ? 'Update set' : 'Save set' }}</button>
      <button
        v-if="isEditing"
        type="button"
        class="text-button"
        @click="closeFormOverlay"
      >
        Cancel
      </button>
    </form>
  </div>
  <div
    v-if="imageViewerSetId !== null"
    class="image-viewer-overlay"
    role="presentation"
    @click.self="closeImageViewer"
  >
    <div class="image-viewer-content">
      <button
        type="button"
        class="icon-button image-viewer-close"
        aria-label="Close image preview"
        @click="closeImageViewer"
      >
        &times;
      </button>
      <button
        type="button"
        class="carousel-button image-viewer-nav image-viewer-prev"
        v-if="getImagesForSet(imageViewerSetId).length > 1"
        aria-label="Show previous overlay image"
        @click.stop="showPreviousViewerImage"
      >
        &#8249;
      </button>
      <img
        :src="imageViewerUrl"
        alt="Fullscreen set preview"
        class="image-viewer-img"
      />
      <button
        type="button"
        class="carousel-button image-viewer-nav image-viewer-next"
        v-if="getImagesForSet(imageViewerSetId).length > 1"
        aria-label="Show next overlay image"
        @click.stop="showNextViewerImage"
      >
        &#8250;
      </button>
      <span
        v-if="getImagesForSet(imageViewerSetId).length > 1"
        class="image-viewer-counter"
      >
        {{ imageViewerIndex + 1 }} / {{ getImagesForSet(imageViewerSetId).length }}
      </span>
    </div>
  </div>

  <div
    v-if="imageManagerSetId !== null"
    class="overlay"
    role="dialog"
    aria-modal="true"
    @click.self="closeImageManager"
  >
    <div class="card overlay-card image-manager-card">
      <div class="overlay-header">
        <h2>Manage images</h2>
        <button
          type="button"
          class="icon-button"
          aria-label="Close image manager"
          @click="closeImageManager"
        >
          &times;
        </button>
      </div>

      <form class="image-upload-form" @submit.prevent="uploadImages(imageManagerSetId!)">
        <label class="image-upload-input">
          <span>{{ getSelectedFileName(imageManagerSetId!) }}</span>
          <input
            :key="uploadInputResetKey[imageManagerSetId!] ?? 0"
            type="file"
            accept="image/*"
            multiple
            @change="handleImageSelection(imageManagerSetId!, $event)"
          />
        </label>
        <button
          type="submit"
          class="primary-button"
          :disabled="!imageUploads[imageManagerSetId!]?.length || imageUploading[imageManagerSetId!]"
        >
          {{ imageUploading[imageManagerSetId!] ? 'Uploading…' : 'Upload' }}
        </button>
      </form>

      <div v-if="getImagesForSet(imageManagerSetId!).length" class="image-manager-list">
        <div
          v-for="(image, index) in getImagesForSet(imageManagerSetId!)"
          :key="image.id"
          class="image-manager-item"
        >
          <img :src="image.url" :alt="image.fileName" />
          <div class="image-manager-item-info">
            <span class="image-manager-item-date">{{ formatImageDate(image.createdAt) }}</span>
            <span class="image-manager-item-source">{{ image.source }}</span>
          </div>
          <div class="image-manager-item-actions">
            <div class="image-manager-sort-buttons">
              <button
                type="button"
                class="image-sort-button"
                :disabled="index === 0"
                aria-label="Move up"
                @click="moveImage(imageManagerSetId!, index, index - 1)"
              >
                &#9650;
              </button>
              <button
                type="button"
                class="image-sort-button"
                :disabled="index === getImagesForSet(imageManagerSetId!).length - 1"
                aria-label="Move down"
                @click="moveImage(imageManagerSetId!, index, index + 1)"
              >
                &#9660;
              </button>
            </div>
            <button
              type="button"
              class="image-manager-delete"
              :disabled="imageDeleting[image.id]"
              @click="deleteImage(imageManagerSetId!, image.id)"
            >
              {{ imageDeleting[image.id] ? '…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
      <p v-else class="image-gallery-empty">No images uploaded yet.</p>
    </div>
  </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

type SetStatus = 'New' | 'Building' | 'Built' | 'Disassembled' | 'Sold';

type BrickSet = {
  id: string;
  manufacturer: string;
  setName: string;
  setNumber: string | null;
  legoReferenceNumber: string | null;
  brickSize: string;
  status: SetStatus;
  purchasePrice: number | null;
  pieceCount: number | null;
  pricePerPiece: number | null;
};

const statuses: SetStatus[] = ['New', 'Building', 'Built', 'Disassembled', 'Sold'];
const brickSizes = ['Diamond', 'Mini', 'Standard'];
const manufacturers = [
  'CaDA',
  'DAGAO',
  'Jiestar',
  'King',
  'LEGO',
  'Lezi',
  'LOZ',
  'Mega',
  'MINISO',
  'Mork',
  'Mould King',
  'Panlos',
  'QLT',
  'TGL',
  'Wange',
  'Unknown'
];
type SortField = 'setName' | 'purchasePrice' | 'pieceCount' | 'pricePerPiece';
const sortOptions: Array<{ key: SortField; label: string }> = [
  { key: 'setName', label: 'Name' },
  { key: 'purchasePrice', label: 'Price' },
  { key: 'pieceCount', label: 'Pieces' },
  { key: 'pricePerPiece', label: 'Price per piece' }
];

const sets = ref<BrickSet[]>([]);
const submitting = ref(false);
const isFormOverlayVisible = ref(false);

type SetImage = {
  id: string;
  setId: string;
  fileName: string;
  source: string;
  originalUrl: string | null;
  sortOrder: number;
  createdAt: string;
  url: string;
};

const setImages = reactive<Record<string, SetImage[]>>({});
const imageUploads = reactive<Record<string, File[]>>({});
const imageUploading = reactive<Record<string, boolean>>({});
const imageDeleting = reactive<Record<string, boolean>>({});
const uploadInputResetKey = reactive<Record<string, number>>({});
const setImageIndexes = reactive<Record<string, number>>({});

const imageViewerSetId = ref<string | null>(null);
const imageViewerIndex = ref(0);
const imageManagerSetId = ref<string | null>(null);

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
const getSelectedFileName = (setId: string) => {
  const files = imageUploads[setId];
  if (!files || files.length === 0) return 'Choose files';
  if (files.length === 1) return files[0].name;
  return `${files.length} files selected`;
};
const formatImageDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

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

const openImageViewer = (setId: string) => {
  imageViewerSetId.value = setId;
  imageViewerIndex.value = getImageIndex(setId);
};
const closeImageViewer = () => {
  imageViewerSetId.value = null;
};
const imageViewerUrl = computed(() => {
  const setId = imageViewerSetId.value;
  if (setId === null) return undefined;
  const images = getImagesForSet(setId);
  if (images.length === 0) return undefined;
  return images[imageViewerIndex.value % images.length]?.url;
});
const showNextViewerImage = () => {
  const setId = imageViewerSetId.value;
  if (setId === null) return;
  const images = getImagesForSet(setId);
  if (images.length < 2) return;
  imageViewerIndex.value = (imageViewerIndex.value + 1) % images.length;
};
const showPreviousViewerImage = () => {
  const setId = imageViewerSetId.value;
  if (setId === null) return;
  const images = getImagesForSet(setId);
  if (images.length < 2) return;
  imageViewerIndex.value = (imageViewerIndex.value - 1 + images.length) % images.length;
};

const openImageManager = (setId: string) => {
  imageManagerSetId.value = setId;
};
const closeImageManager = () => {
  imageManagerSetId.value = null;
};

const handleImageSelection = (setId: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  imageUploads[setId] = target.files ? Array.from(target.files) : [];
};

const resetUploadInput = (setId: string) => {
  uploadInputResetKey[setId] = (uploadInputResetKey[setId] ?? 0) + 1;
};

const fetchSetImages = async (setId: string) => {
  try {
    const response = await fetch(`/api/sets/${setId}/images`);
    if (!response.ok) {
      throw new Error('Unable to load set images');
    }
    setImages[setId] = await response.json();
  } catch (error) {
    console.error('Failed to load images for set', setId, error);
    setImages[setId] = [];
  }
};

const refreshImagesForAllSets = async () => {
  await Promise.all(sets.value.map((set) => fetchSetImages(set.id)));
};

const uploadImages = async (setId: string) => {
  const files = imageUploads[setId];
  if (!files || files.length === 0) return;
  imageUploading[setId] = true;
  try {
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }
    const response = await fetch(`/api/sets/${setId}/images`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    imageUploads[setId] = [];
    resetUploadInput(setId);
    await fetchSetImages(setId);
  } catch (error) {
    console.error('Unable to upload images', error);
  } finally {
    imageUploading[setId] = false;
  }
};

const deleteImage = async (setId: string, imageId: string) => {
  imageDeleting[imageId] = true;
  try {
    const response = await fetch(`/api/sets/${setId}/images/${imageId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Unable to delete image');
    }
    await fetchSetImages(setId);
  } catch (error) {
    console.error('Failed to delete image', error);
  } finally {
    imageDeleting[imageId] = false;
  }
};

const moveImage = async (setId: string, fromIndex: number, toIndex: number) => {
  const images = getImagesForSet(setId);
  if (toIndex < 0 || toIndex >= images.length) return;
  const reordered = [...images];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  setImages[setId] = reordered;
  try {
    const response = await fetch(`/api/sets/${setId}/images/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds: reordered.map((img) => img.id) })
    });
    if (!response.ok) {
      throw new Error('Unable to reorder images');
    }
    setImages[setId] = await response.json();
  } catch (error) {
    console.error('Failed to reorder images', error);
    await fetchSetImages(setId);
  }
};

type FormPayload = {
  manufacturer: string;
  setName: string;
  setNumber: string;
  legoReferenceNumber: string;
  brickSize: string;
  status: SetStatus;
  purchasePrice: string;
  pieceCount: string;
};

const createEmptyForm = (): FormPayload => ({
  manufacturer: '',
  setName: '',
  setNumber: '',
  legoReferenceNumber: '',
  brickSize: 'Standard',
  status: statuses[0],
  purchasePrice: '',
  pieceCount: ''
});

const form = ref<FormPayload>(createEmptyForm());
const editingId = ref<string | null>(null);
const isEditing = computed(() => Boolean(editingId.value));

const clearFormFields = () => {
  editingId.value = null;
  form.value = createEmptyForm();
};

const formatDecimalInputValue = (value: string) => {
  const sanitized = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  if (sanitized === '') {
    return '';
  }
  const [intPart, decPart] = sanitized.split('.');
  return decPart !== undefined ? `${intPart},${decPart}` : intPart;
};

const handleDecimalInput = (field: 'purchasePrice', rawValue: string) => {
  form.value[field] = formatDecimalInputValue(rawValue);
};

const parseDecimalString = (value: string) => {
  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const openAddForm = () => {
  clearFormFields();
  isFormOverlayVisible.value = true;
};

const closeFormOverlay = () => {
  clearFormFields();
  isFormOverlayVisible.value = false;
};

const formatWithComma = (value: number, digits: number) => {
  return value.toFixed(digits).replace('.', ',');
};

const formatSetNumber = (set: BrickSet) => {
  if (set.legoReferenceNumber) {
    return set.setNumber
      ? `#${set.legoReferenceNumber} (#${set.setNumber})`
      : set.legoReferenceNumber;
  }
  return set.setNumber ? `#${set.setNumber}` : '';
};

const formatPrice = (value: number | null) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return `€${formatWithComma(value, 2)}`;
};

const formatCents = (value: number | null) => {
  if (value === null || value === undefined) {
    return '—';
  }
  const cents = value * 100;
  return `${formatWithComma(cents, 3)} ct`;
};

const filters = reactive({
  manufacturer: '',
  status: '',
  brickSize: ''
});

const sortField = ref<SortField>('setName');
const sortDirection = ref<'asc' | 'desc'>('asc');

const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
};

const setSortField = (field: SortField) => {
  if (sortField.value === field) {
    toggleSortDirection();
    return;
  }
  sortField.value = field;
  sortDirection.value = 'asc';
};

const resetFilters = () => {
  filters.manufacturer = '';
  filters.status = '';
  filters.brickSize = '';
  sortField.value = 'setName';
  sortDirection.value = 'asc';
};

const filteredSets = computed(() => {
  let result = sets.value.slice();

  if (filters.manufacturer) {
    result = result.filter(
      (set) => set.manufacturer?.toLowerCase() === filters.manufacturer.toLowerCase()
    );
  }
  if (filters.status) {
    result = result.filter((set) => set.status === filters.status);
  }
  if (filters.brickSize) {
    result = result.filter((set) => set.brickSize === filters.brickSize);
  }

  result.sort((a, b) => {
    const direction = sortDirection.value === 'asc' ? 1 : -1;
    const aValue = a[sortField.value];
    const bValue = b[sortField.value];

    if (aValue === null || aValue === undefined) {
      return 1 * direction;
    }
    if (bValue === null || bValue === undefined) {
      return -1 * direction;
    }
    if (sortField.value === 'setName') {
      return String(aValue).localeCompare(String(bValue)) * direction;
    }
    return (Number(aValue) - Number(bValue)) * direction;
  });
  return result;
});

const loadSets = async () => {
  try {
    const response = await fetch('/api/sets');
    if (!response.ok) {
      throw new Error('Unable to load sets');
    }
    sets.value = await response.json();
    await refreshImagesForAllSets();
  } catch (error) {
    console.error(error);
  }
};

const startEditing = (set: BrickSet) => {
  editingId.value = set.id;
  form.value = {
    manufacturer: set.manufacturer,
    setName: set.setName,
    setNumber: set.setNumber ?? '',
    legoReferenceNumber: set.legoReferenceNumber ?? '',
    brickSize: set.brickSize ?? 'Standard',
    status: set.status,
    purchasePrice:
      set.purchasePrice != null ? formatWithComma(set.purchasePrice, 2) : '',
    pieceCount: set.pieceCount != null ? String(set.pieceCount) : ''
  };
  isFormOverlayVisible.value = true;
};

const saveSet = async () => {
  if (!form.value.manufacturer || !form.value.setName) {
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      manufacturer: form.value.manufacturer,
      setName: form.value.setName,
      setNumber: form.value.setNumber || null,
      legoReferenceNumber: form.value.legoReferenceNumber || null,
      brickSize: brickSizes.includes(form.value.brickSize)
        ? form.value.brickSize
        : 'Standard',
      status: form.value.status,
      purchasePrice:
        form.value.purchasePrice === '' ? null : parseDecimalString(form.value.purchasePrice),
      pieceCount: form.value.pieceCount === '' ? null : Number(form.value.pieceCount)
    };

    const targetId = editingId.value;
    const response = await fetch(targetId ? `/api/sets/${targetId}` : '/api/sets', {
      method: targetId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Unable to save set');
    }

    await loadSets();
    closeFormOverlay();
  } catch (error) {
    console.error(error);
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadSets();
});
</script>

<style scoped>
:global(body) {
  margin: 0;
}

.page {
  min-height: 100vh;
  padding: 2rem;
}

.hero {
  text-align: center;
  margin-bottom: 2rem;
}

.eyebrow {
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: #0f172a;
}

.content-grid {
  display: grid;
  gap: 1rem;
}

.card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.1);
}

.form-card button {
  width: 100%;
  padding: 0.85rem;
  margin-top: 0.75rem;
  border: none;
  border-radius: 0.9rem;
  background: #ffd502;
  color: #000;
  font-size: 1rem;
  cursor: pointer;
}

.text-button {
  background: none;
  border: none;
  color: #475569;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  cursor: pointer;
}

.link-button {
  margin-top: 0.75rem;
  background: none;
  border: none;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.link-button:hover {
  text-decoration: underline;
}

.form-card input,
.form-card select {
  width: 100%;
  padding: 0.65rem;
  margin-top: 0.15rem;
  border-radius: 0.65rem;
  border: 1px solid rgba(15, 23, 42, 0.2);
  font-size: 0.9rem;
}

.form-card label {
  font-size: 0.85rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1rem;
}

@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.controls-card {
  padding-bottom: 5px;
}
.controls-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.chip-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.controls-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #495c6a;
}

.chip {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem 0.5rem;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.1);
  font-size: 0.75rem;
  min-width: 120px;
  position: relative;
}

.chip select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  opacity: 0;
  cursor: pointer;
}

.filter-chip span {
  pointer-events: none;
}

.sort-chips {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.sort-chip {
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 999px;
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  flex-direction: row;
}

.sort-chip.active {
  border-color: #ffd502;
  background: #fff699;
}

.sort-direction {
  font-size: 0.65rem;
  color: #7e869a;
}

.reset-chip {
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.75rem;
  background: #fff;
  cursor: pointer;
  color: #f56060;
  position: absolute;
  right: -2px;
  transform: translateX(-50%);
}

.reset-chip:hover {
  border: 1px solid rgba(247, 30, 30, 0.45);
  background: #f7cfcf;
  transition: filter 0.2s ease;
}

@media (max-width: 800px) {
  .controls-bar {
    flex-direction: column;
  }
}

.list-header__title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.list-header__title h2 {
  margin: 0;
}

.count {
  font-weight: 600;
  color: #475569;
}

.primary-button {
  border: none;
  border-radius: 0.9rem;
  background: #ffd502;
  color: #000;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  cursor: pointer;
  transition: filter 0.2s ease;
}

.primary-button:hover {
  filter: brightness(0.95);
}

.set-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, 1fr);
}

.set-card {
  padding: 1rem;
  border-radius: 1rem;
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.08);
  cursor: pointer;
}

.set-card__layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  align-items: start;
}

.set-card__image-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 300px;
}

.set-card__image-wrapper {
  position: relative;
  width: 100%;
  height: 250px;
}

.set-card__image {
  width: 100%;
  height: 100%;
  border-radius: 0.75rem;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  object-fit: contain;
  cursor: pointer;
  padding: 3px;
}

.set-card__image-controls {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.05), rgba(15, 23, 42, 0.01));
  pointer-events: none;
  border-radius: 0.75rem;
}

.set-card__image-wrapper:hover .set-card__image-controls {
  opacity: 1;
}

.set-card__image-controls button {
  pointer-events: auto;
}


.set-card__image-empty {
  position: relative;
  width: 100%;
  height: 250px;
  border-radius: 0.75rem;
  background: #f1f5f9;
  border: 1px dashed rgba(15, 23, 42, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: #94a3b8;
}

.manage-images-gear {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  font-size: 1.05rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 2;
}

.set-card__image-wrapper:hover .manage-images-gear {
  opacity: 1;
}

.set-card__image-empty .manage-images-gear {
  position: absolute;
  opacity: 0.6;
}

.set-card__image-empty:hover .manage-images-gear {
  opacity: 1;
}

.manage-images-gear:hover {
  transform: rotate(45deg);
  background: #fff;
}

.image-gallery-empty {
  font-size: 0.85rem;
  color: #64748b;
  text-align: center;
  padding: 1rem 0;
}

.image-upload-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.image-upload-input {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px dashed rgba(15, 23, 42, 0.3);
  font-size: 0.85rem;
  background: #f8fafc;
  cursor: pointer;
}

.image-upload-input input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.image-upload-form .primary-button {
  font-size: 0.85rem;
  padding: 0.5rem;
}

.image-manager-card {
  width: min(520px, 100%);
}

.image-manager-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.image-manager-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.image-manager-item img {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.image-manager-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.image-manager-item-date {
  font-size: 0.8rem;
  color: #334155;
}

.image-manager-item-source {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

.image-manager-item-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.image-manager-sort-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.image-sort-button {
  width: 1.6rem;
  height: 1.4rem;
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 0.3rem;
  background: #fff;
  cursor: pointer;
  font-size: 0.55rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  transition: background 0.15s ease;
}

.image-sort-button:hover:not(:disabled) {
  background: #f1f5f9;
}

.image-sort-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.image-manager-delete {
  border: none;
  border-radius: 0.5rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  background: #fee2e2;
  color: #dc2626;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.image-manager-delete:hover {
  background: #fecaca;
}

.image-manager-delete:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.carousel-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: none;
  background: #ffffff;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.1);
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.carousel-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.carousel-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.15);
}

.set-card__details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-left: 1rem;
}

.set-card__actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .set-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(1, 1fr);
  }
  .set-card__layout {
    grid-template-columns: 1fr;
  }

  .set-card__image-panel {
    order: -1;
    width: 100%;
  }

  .set-card__details {
    margin-left: 0;
  }
}

.set-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.set-card__manufacturer {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.set-card__status {
  font-size: 0.8rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
}

.set-card__name {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 600;
}

.set-card__number {
  margin: 0.15rem 0;
  font-size: 0.75rem;
  color: #0f172a;
  opacity: 0.45;
}

.set-card__meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-top: 0.8rem;
}

.set-card__meta dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.set-card__meta dd {
  margin: 0;
  font-weight: 600;
  font-size: 0.85em;
}

.empty {
  padding: 1rem 0;
  color: #475569;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 50;
}

.overlay-card {
  width: min(440px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.75rem;
}

.overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.overlay-header > .icon-button {
  width: 2.5rem;
  padding: 0;
}

.overlay-header h2 {
  margin: 0;
}

.icon-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.2);
  background: #fff;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.image-viewer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 55;
}

.image-viewer-content {
  position: relative;
  max-width: min(85vw, 900px);
  width: 100%;
  background: #fff;
  border-radius: 1rem;
  padding: 1.5rem 2rem;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-viewer-nav {
  position: absolute;
  top: 50%;
  width: 3rem;
  height: 3rem;
  margin-top: -1.5rem;
  border-radius: 50%;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-viewer-prev {
  left: -3.2rem;
}

.image-viewer-next {
  right: -3.25rem;
}

.image-viewer-img {
  width: 100%;
  border-radius: 1rem;
  max-height: 85vh;
  object-fit: contain;
}

.image-viewer-close {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(255, 255, 255, 0.9);
}

.image-viewer-counter {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: #475569;
  background: rgba(255, 255, 255, 0.85);
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  letter-spacing: 0.05em;
}
</style>
