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
              <div v-if="getImagesForSet(set.id).length" class="image-gallery-grid">
                <figure
                  v-for="image in getImagesForSet(set.id)"
                  :key="image.id"
                  class="image-gallery-item"
                >
                  <img
                    :src="image.url"
                    :alt="`Image thumbnail for ${set.setName}`"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    class="image-gallery-delete"
                    :disabled="imageDeleting[image.id]"
                    @click.stop="deleteImage(set.id, image.id)"
                  >
                    {{ imageDeleting[image.id] ? 'Removing…' : 'Delete' }}
                  </button>
                  <figcaption>{{ formatImageDate(image.createdAt) }}</figcaption>
                </figure>
              </div>
              <p v-else class="image-gallery-empty">
                No images yet. Upload one to show this set.
              </p>
              <form class="image-upload-form" @submit.prevent="uploadImage(set.id)">
                <label class="image-upload-input">
                  <span>{{ getSelectedFileName(set.id) }}</span>
                  <input
                    :key="uploadInputResetKey[set.id] ?? 0"
                    type="file"
                    accept="image/*"
                    @change="handleImageSelection(set.id, $event)"
                  />
                </label>
                <button
                  type="submit"
                  class="primary-button"
                  :disabled="!imageUploads[set.id] || imageUploading[set.id]"
                >
                  {{ imageUploading[set.id] ? 'Uploading…' : 'Upload image' }}
                </button>
              </form>
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
  createdAt: string;
  url: string;
};

const setImages = reactive<Record<string, SetImage[]>>({});
const imageUploads = reactive<Record<string, File | null>>({});
const imageUploading = reactive<Record<string, boolean>>({});
const imageDeleting = reactive<Record<string, boolean>>({});
const uploadInputResetKey = reactive<Record<string, number>>({});

const getImagesForSet = (setId: string) => setImages[setId] ?? [];
const getSelectedFileName = (setId: string) => imageUploads[setId]?.name ?? 'Choose file';
const formatImageDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

const handleImageSelection = (setId: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  imageUploads[setId] = target.files?.[0] ?? null;
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

const uploadImage = async (setId: string) => {
  const file = imageUploads[setId];
  if (!file) {
    return;
  }
  imageUploading[setId] = true;
  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`/api/sets/${setId}/images`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    imageUploads[setId] = null;
    resetUploadInput(setId);
    await fetchSetImages(setId);
  } catch (error) {
    console.error('Unable to upload image', error);
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
  gap: 0.75rem;
  width: 300px;
}

.image-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
}

.image-gallery-item {
  margin: 0;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  position: relative;
}

.image-gallery-item img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
}

.image-gallery-item figcaption {
  padding: 0.35rem 0.5rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
}

.image-gallery-delete {
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #f87171;
  color: #fff;
  cursor: pointer;
  align-self: flex-end;
  margin-right: 0.2rem;
  transition: transform 0.2s ease;
}

.image-gallery-delete:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.image-gallery-delete:not(:disabled):hover {
  transform: translateY(-1px);
}

.image-gallery-empty {
  font-size: 0.85rem;
  color: #64748b;
  text-align: center;
}

.image-upload-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
</style>
