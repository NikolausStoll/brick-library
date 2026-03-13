<template>
  <main class="page">
  <section class="content-grid">
    <nav class="page-tabs">
      <button
        type="button"
        :class="{ active: activeTab === 'collection' }"
        @click="activeTab = 'collection'"
      >Collection</button>
      <button
        type="button"
        :class="{ active: activeTab === 'wishlist' }"
        @click="activeTab = 'wishlist'"
      >Wishlist</button>
    </nav>
    <section class="card controls-card">
      <div class="controls-bar">
        <div class="chip-group">
          <span class="controls-label">Filter</span>
          <div class="filter-chips">
            <div class="chip filter-chip" :class="{ active: filters.manufacturer }">
              <span>{{ filters.manufacturer || isMobileLayout ? 'Mfr.' : 'Manufacturer' }}</span>
              <select v-model="filters.manufacturer">
                <option value="">All</option>
                <option v-for="manufacturer in activeManufacturers" :key="manufacturer" :value="manufacturer">
                  {{ manufacturer }}
                </option>
              </select>
            </div>
            <div class="chip filter-chip" :class="{ active: filters.theme }">
              <span>{{ filters.theme || 'Theme' }}</span>
              <select v-model="filters.theme">
                <option value="">All</option>
                <option v-for="theme in activeThemes" :key="theme" :value="theme">
                  {{ theme }}
                </option>
              </select>
            </div>
            <div class="chip filter-chip" :class="{ active: filters.status }">
              <span>{{ filters.status || 'Status' }}</span>
              <select v-model="filters.status">
                <option value="">All</option>
                <option v-for="status in statuses" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </div>
            <div class="chip filter-chip" :class="{ active: filters.brickSize }">
              <span>{{ filters.brickSize || 'Brick size' }}</span>
              <select v-model="filters.brickSize">
                <option value="">All</option>
                <option v-for="size in brickSizes" :key="size" :value="size">
                  {{ size }}
                </option>
              </select>
            </div>
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
          </div>
        </div>
        <button type="button" class="chip reset-chip" @click="resetFilters">
          Reset
        </button>
      </div>
    </section>
    <section v-if="filteredSets.length > 0" class="card stats-card">
      <dl class="stats-grid">
        <div>
          <dt>Total Sets</dt>
          <dd>{{ filteredSets.length }}</dd>
        </div>
        <div>
          <dt>Total Price</dt>
          <dd>{{ formatPrice(collectionStats.totalPrice) }}</dd>
        </div>
        <div>
          <dt>Total Pieces</dt>
          <dd>{{ collectionStats.totalPieces?.toLocaleString() ?? '—' }}</dd>
        </div>
        <div>
          <dt>Avg. Price / Piece</dt>
          <dd>{{ formatCents(collectionStats.avgPricePerPiece) }}</dd>
        </div>
        <div>
          <dt>New Sets</dt>
          <dd>{{ collectionStats.newSets }}</dd>
        </div>
        <div>
          <dt>Built Sets</dt>
          <dd>{{ collectionStats.builtSets }}</dd>
        </div>
      </dl>
    </section>
    <section class="card list-card">
      <button type="button" class="add-button" @click="openAddForm" aria-label="Add set">+</button>
      <div v-if="filteredSets.length === 0" class="empty">
        {{ activeSets.length === 0
          ? (activeTab === 'wishlist' ? 'No wishlist items yet.' : 'No sets yet. Add one to start tracking your library.')
          : 'No sets match the active filters.' }}
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
                <p class="set-card__status" :data-status="set.status" @click.stop="cycleSetStatus(set)">{{ set.status }}</p>
              </div>
              <p class="set-card__name">{{ set.setName }}<span v-if="set.year" class="set-card__year">({{ set.year }})</span></p>
          <p class="set-card__number" v-if="set.setNumber || set.legoReferenceNumber">
            {{ formatSetNumber(set) }}
          </p>
              <dl class="set-card__meta">
                <div>
                  <dt>{{ set.listType === 'wishlist' ? 'Target Price' : 'Price' }}</dt>
                  <dd>{{ formatPrice(set.purchasePrice) }}</dd>
                </div>
                <div>
                  <dt>Pieces</dt>
                  <dd>{{ set.pieceCount ?? '—' }}</dd>
                </div>
                <div>
                  <dt v-if="isMobileLayout">ct/piece</dt>
                  <dt v-else>Price/Piece</dt>
                  <dd>{{ formatCents(set.pricePerPiece) }}</dd>
                </div>
                <div>
                  <dt v-if="isMobileLayout">Size</dt>
                  <dt v-else>Brick Size</dt>
                  <dd>{{ set.brickSize }}</dd>
                </div>
              </dl>
              <div class="set-card__chips" v-if="set.hasOriginalBox || set.retiredProduct || set.hasPrintedPhoto || set.instructionsUrl">
                <a
                  v-if="set.instructionsUrl"
                  class="detail-chip detail-chip--instructions"
                  :class="{ active: filters.hasInstructions }"
                  :href="set.instructionsUrl"
                  target="_blank"
                  rel="noopener"
                  @click.stop
                >Instructions</a>
                <span
                  v-if="set.retiredProduct"
                  class="detail-chip detail-chip--retired"
                  :class="{ active: filters.retiredProduct }"
                  @click.stop="toggleChipFilter('retiredProduct')"
                >Retired</span>
                <span class="set-card__chips-spacer"></span>
                <span
                  v-if="set.hasOriginalBox"
                  class="detail-chip detail-chip--info"
                  :class="{ active: filters.hasOriginalBox }"
                  @click.stop="toggleChipFilter('hasOriginalBox')"
                >Box</span>
                <span
                  v-if="set.hasPrintedPhoto"
                  class="detail-chip detail-chip--info"
                  :class="{ active: filters.hasPrintedPhoto }"
                  @click.stop="toggleChipFilter('hasPrintedPhoto')"
                >Photo</span>
              </div>
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
    @keydown.esc="closeFormOverlay"
    tabindex="-1"
    ref="formOverlayRef"
  >
    <form class="card form-card overlay-card" @submit.prevent="saveSet">
      <div class="overlay-header">
        <h2>{{ isEditing ? 'Edit set' : activeTab === 'wishlist' ? 'Add to wishlist' : 'Add a set' }}</h2>
        <div class="overlay-header__actions">
          <button
            v-if="isEditing && editingSet?.listType === 'wishlist'"
            type="button"
            class="icon-button move-icon-button"
            aria-label="Move to Collection"
            title="Move to Collection"
            @click="openMoveOverlay"
          >&#10132;</button>
          <button
            type="button"
            class="icon-button"
            aria-label="Close form"
            @click="closeFormOverlay"
          >
            &times;
          </button>
        </div>
      </div>
      <div v-if="isEditing && editingSet?.listType !== 'wishlist'" class="form-tabs">
        <button
          type="button"
          class="tab-button"
          :class="{ active: editTab === 'general' }"
          @click="editTab = 'general'"
        >General</button>
        <button
          type="button"
          class="tab-button"
          :class="{ active: editTab === 'details' }"
          @click="editTab = 'details'"
        >Details</button>
      </div>
      <div v-show="!isEditing || editTab === 'general'" class="form-grid">
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
        <label v-if="activeTab === 'collection' && !isEditing || isEditing && editingSet?.listType !== 'wishlist'">
          Purchase price (EUR)
          <input
            v-model="form.purchasePrice"
            type="text"
            inputmode="decimal"
            placeholder="199,99"
            @input="handleDecimalInput('purchasePrice', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label>
          Piece count
          <input v-model="form.pieceCount" type="number" min="0" placeholder="7541" />
        </label>
        <label v-if="activeTab === 'wishlist' || (isEditing && editingSet?.listType === 'wishlist')">
          Price per piece (EUR)
          <input
            v-model="form.pricePerPiece"
            type="text"
            inputmode="decimal"
            placeholder="0,05"
            @input="handleDecimalInput('pricePerPiece', ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
      <div v-if="isEditing && editingSet?.listType !== 'wishlist'" v-show="editTab === 'details'" class="form-grid">
        <label class="toggle-label">
          Has original box
          <label class="toggle-switch">
            <input v-model="form.hasOriginalBox" type="checkbox" />
            <span class="toggle-slider"></span>
          </label>
        </label>
        <label class="toggle-label">
          Has printed photo
          <label class="toggle-switch">
            <input v-model="form.hasPrintedPhoto" type="checkbox" />
            <span class="toggle-slider"></span>
          </label>
        </label>
        <label class="toggle-label">
          Retired product
          <label class="toggle-switch">
            <input v-model="form.retiredProduct" type="checkbox" />
            <span class="toggle-slider"></span>
          </label>
        </label>
        <label>
          Theme
          <input v-model="form.theme" type="text" placeholder="Star Wars" />
        </label>
        <label>
          Year
          <input v-model="form.year" type="number" min="1900" max="2100" placeholder="2024" />
        </label>
        <label>
          Instructions URL
          <input v-model="form.instructionsUrl" type="url" placeholder="https://..." />
        </label>
        <label class="full-width">
          Notes
          <textarea v-model="form.notes" rows="3" placeholder="Any additional notes…"></textarea>
        </label>
      </div>
      <div v-if="isEditing" class="form-actions-row">
        <button type="submit" class="primary-button" :disabled="submitting">Update set</button>
        <button
          type="button"
          class="delete-set-button"
          :class="{ confirming: deleteSetConfirming }"
          :disabled="deletingSet"
          @click="deleteSet(editingId!)"
        >
          {{ deletingSet ? 'Deleting…' : deleteSetConfirming ? 'Are you sure?' : 'Delete set' }}
        </button>
      </div>
      <button v-if="!isEditing" type="submit" class="primary-button" :disabled="submitting">Save set</button>
    </form>
  </div>
  <div
    v-if="moveOverlayVisible"
    class="overlay"
    role="dialog"
    aria-modal="true"
    @click.self="moveOverlayVisible = false"
    @keydown.esc="moveOverlayVisible = false"
    tabindex="-1"
  >
    <div class="card overlay-card">
      <div class="overlay-header">
        <h2>Move to Collection</h2>
        <button type="button" class="icon-button" aria-label="Close" @click="moveOverlayVisible = false">&times;</button>
      </div>
      <p class="move-hint">Enter the actual purchase price. Leave empty to keep the calculated wishlist price.</p>
      <label class="move-price-label">
        Purchase price (EUR)
        <input
          v-model="movePurchasePrice"
          type="text"
          inputmode="decimal"
          placeholder="199,99"
          @input="movePurchasePrice = formatDecimalInputValue(($event.target as HTMLInputElement).value)"
        />
      </label>
      <button type="button" class="primary-button move-confirm-button" :disabled="movingSet" @click="moveToCollection">
        {{ movingSet ? 'Moving…' : 'Confirm' }}
      </button>
    </div>
  </div>
  <div
    v-if="imageViewerSetId !== null"
    class="image-viewer-overlay"
    role="presentation"
    @click.self="closeImageViewer"
  >
    <div class="image-viewer-content" :class="{ zoomed: imageViewerZoomed }">
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
        :class="{ dragging: zoomDragging }"
        :style="imageViewerZoomed ? zoomedImageStyle : undefined"
        @mousedown.prevent.stop="onZoomMouseDown"
        @mousemove.prevent="onZoomMouseMove"
        @mouseup.prevent.stop="onZoomMouseUp"
        @mouseleave="onZoomMouseLeave"
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

      <div class="upload-tabs">
        <button type="button" :class="{ active: uploadMode === 'file' }" @click="uploadMode = 'file'">File</button>
        <button type="button" :class="{ active: uploadMode === 'url' }" @click="uploadMode = 'url'">URL</button>
        <button type="button" :class="{ active: uploadMode === 'html' }" @click="uploadMode = 'html'">HTML</button>
      </div>

      <form v-if="uploadMode === 'file'" class="upload-panel" @submit.prevent="uploadImages(imageManagerSetId!)">
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

      <form v-else-if="uploadMode === 'url'" class="upload-panel" @submit.prevent="uploadImageFromUrl(imageManagerSetId!)">
        <input
          v-model="imageUrlInput"
          type="url"
          placeholder="https://example.com/image.jpg"
          required
        />
        <button type="submit" class="primary-button" :disabled="imageUrlUploading">
          {{ imageUrlUploading ? 'Downloading…' : 'Download' }}
        </button>
        <div v-if="imageUrlError" class="upload-error">{{ imageUrlError }}</div>
      </form>

      <form v-else class="upload-panel" @submit.prevent="scrapeImages(imageManagerSetId!)">
        <label>
          HTML containing &lt;img&gt; tags
          <textarea
            v-model="scrapeForm.rawHtml"
            rows="4"
            placeholder='<div class="gallery">&#10;  <img src="https://..." />&#10;</div>'
            required
          ></textarea>
        </label>
        <label>
          Base URL <span class="label-hint">(optional, for relative src)</span>
          <input
            v-model="scrapeForm.baseUrl"
            type="url"
            placeholder="https://example.com"
          />
        </label>
        <button type="submit" class="primary-button" :disabled="scrapeLoading">
          {{ scrapeLoading ? 'Scraping…' : 'Scrape' }}
        </button>
        <div v-if="scrapeResult" class="upload-success">
          Found {{ scrapeResult.found }}, downloaded {{ scrapeResult.downloaded }}, skipped {{ scrapeResult.skipped }}
        </div>
        <div v-if="scrapeError" class="upload-error">{{ scrapeError }}</div>
      </form>

      <div v-if="getImagesForSet(imageManagerSetId!).length" class="image-manager-list">
        <div
          v-for="(image, index) in getImagesForSet(imageManagerSetId!)"
          :key="image.id"
          class="image-manager-item"
        >
          <img :src="image.url" :alt="image.fileName" />
          <div class="image-manager-item-info">
            <span v-if="!isMobileLayout" class="image-manager-item-date">{{ formatImageDate(image.createdAt) }}</span>
            <span v-if="!isMobileLayout" class="image-manager-item-source">{{ image.source }}</span>
            <span class="image-manager-item-meta">Image size: {{ formatImageDimensions(image) }}</span>
            <span class="image-manager-item-meta">File size: {{ formatFileSize(image.fileSize) }}</span>
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
        <button
          type="button"
          class="delete-all-button"
          :class="{ confirming: deleteAllConfirming }"
          :disabled="deletingAllImages"
          @click="deleteAllImages(imageManagerSetId!)"
        >
          {{ deletingAllImages ? 'Deleting…' : deleteAllConfirming ? 'Are you sure?' : 'Delete all images' }}
        </button>
      </div>
      <p v-else class="image-gallery-empty">No images uploaded yet.</p>
    </div>
  </div>
  <div class="app-footer">
    <span class="app-version">v{{ appVersion }}</span>
    <button type="button" class="dark-mode-toggle" @click="toggleDarkMode" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
      {{ isDark ? '☀️' : '🌙' }}
    </button>
  </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import configText from '../../brick-library/config.yaml?raw';

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
  hasOriginalBox: boolean;
  hasPrintedPhoto: boolean;
  year: number | null;
  notes: string | null;
  instructionsUrl: string | null;
  retiredProduct: boolean | null;
  theme: string | null;
  listType: 'collection' | 'wishlist';
};

type ListType = 'collection' | 'wishlist';

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

const MOBILE_BREAKPOINT = 768;
const isMobileLayout = ref(
  typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
);
const updateIsMobileLayout = () => {
  isMobileLayout.value = window.innerWidth <= MOBILE_BREAKPOINT;
};

type SortField = 'setName' | 'purchasePrice' | 'pieceCount' | 'pricePerPiece';
const sortOptions: Array<{ key: SortField; label: string }> = [
  { key: 'setName', label: 'Name' },
  { key: 'purchasePrice', label: 'Price' },
  { key: 'pieceCount', label: 'Pieces' },
  { key: 'pricePerPiece', label: isMobileLayout.value ? 'ct/piece' : 'Price per piece' }
];

const sets = ref<BrickSet[]>([]);
const activeTab = ref<ListType>('collection');

const activeSets = computed(() =>
  sets.value.filter((s) => s.listType === activeTab.value)
);
const activeManufacturers = computed(() =>
  [...new Set(activeSets.value.map((s) => s.manufacturer))].sort()
);
const activeThemes = computed(() =>
  [...new Set(activeSets.value.map((s) => s.theme).filter(Boolean))].sort() as string[]
);
const submitting = ref(false);
const isFormOverlayVisible = ref(false);
const formOverlayRef = ref<HTMLElement | null>(null);

type SetImage = {
  id: string;
  setId: string;
  fileName: string;
  source: string;
  originalUrl: string | null;
  sortOrder: number;
  createdAt: string;
  url: string;
  imageWidth: number | null;
  imageHeight: number | null;
  fileSize: number | null;
};

const setImages = reactive<Record<string, SetImage[]>>({});
const imageUploads = reactive<Record<string, File[]>>({});
const imageUploading = reactive<Record<string, boolean>>({});
const imageDeleting = reactive<Record<string, boolean>>({});
const uploadInputResetKey = reactive<Record<string, number>>({});
const setImageIndexes = reactive<Record<string, number>>({});

const imageViewerSetId = ref<string | null>(null);
const imageViewerIndex = ref(0);
const imageViewerZoomed = ref(false);
const zoomOrigin = reactive({ x: 50, y: 50 });
const zoomPan = reactive({ x: 0, y: 0 });
const zoomDragStart = reactive({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
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

const formatImageDimensions = (image: SetImage) => {
  if (image.imageWidth && image.imageHeight) {
    return `${image.imageWidth}×${image.imageHeight}px`;
  }
  if (image.imageWidth || image.imageHeight) {
    return `${image.imageWidth ?? '—'}×${image.imageHeight ?? '—'} px`;
  }
  return '—';
};

const formatFileSize = (value: number | null) => {
  if (value == null) return '—';
  const kb = value / 1024;
  return `${kb.toFixed(1)} KB`;
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

const openImageViewer = (setId: string) => {
  imageViewerSetId.value = setId;
  imageViewerIndex.value = getImageIndex(setId);
};
const closeImageViewer = () => {
  imageViewerSetId.value = null;
  imageViewerZoomed.value = false;
  resetZoomState();
};

const handleViewerKeydown = (event: KeyboardEvent) => {
  if (imageViewerSetId.value === null) return;
  if (event.key === 'Escape') {
    closeImageViewer();
  } else if (event.key === 'ArrowRight') {
    showNextViewerImage();
  } else if (event.key === 'ArrowLeft') {
    showPreviousViewerImage();
  }
};

watch(imageViewerSetId, (newVal, oldVal) => {
  if (newVal !== null && oldVal === null) {
    window.addEventListener('keydown', handleViewerKeydown);
  } else if (newVal === null && oldVal !== null) {
    window.removeEventListener('keydown', handleViewerKeydown);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleViewerKeydown);
  window.removeEventListener('resize', updateIsMobileLayout);
});

const ZOOM_SCALE = 2.5;
const zoomDragging = ref(false);
const zoomDidDrag = ref(false);

const resetZoomState = () => {
  zoomOrigin.x = 50;
  zoomOrigin.y = 50;
  zoomPan.x = 0;
  zoomPan.y = 0;
  zoomDragging.value = false;
  zoomDidDrag.value = false;
};

const onZoomMouseDown = (event: MouseEvent) => {
  if (!imageViewerZoomed.value) {
    const img = event.currentTarget as HTMLElement;
    const rect = img.getBoundingClientRect();
    zoomOrigin.x = ((event.clientX - rect.left) / rect.width) * 100;
    zoomOrigin.y = ((event.clientY - rect.top) / rect.height) * 100;
    zoomPan.x = 0;
    zoomPan.y = 0;
    imageViewerZoomed.value = true;
    return;
  }
  zoomDragging.value = true;
  zoomDidDrag.value = false;
  zoomDragStart.mouseX = event.clientX;
  zoomDragStart.mouseY = event.clientY;
  zoomDragStart.panX = zoomPan.x;
  zoomDragStart.panY = zoomPan.y;
};

const onZoomMouseMove = (event: MouseEvent) => {
  if (!zoomDragging.value) return;
  const dx = event.clientX - zoomDragStart.mouseX;
  const dy = event.clientY - zoomDragStart.mouseY;
  if (!zoomDidDrag.value && Math.abs(dx) + Math.abs(dy) > 4) {
    zoomDidDrag.value = true;
  }
  zoomPan.x = zoomDragStart.panX + dx / ZOOM_SCALE;
  zoomPan.y = zoomDragStart.panY + dy / ZOOM_SCALE;
};

const onZoomMouseUp = () => {
  if (zoomDragging.value && !zoomDidDrag.value) {
    imageViewerZoomed.value = false;
    resetZoomState();
  }
  zoomDragging.value = false;
  zoomDidDrag.value = false;
};

const onZoomMouseLeave = () => {
  zoomDragging.value = false;
  zoomDidDrag.value = false;
};

const zoomedImageStyle = computed(() => ({
  transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
  transform: `scale(${ZOOM_SCALE}) translate(${zoomPan.x}px, ${zoomPan.y}px)`
}));

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
  imageViewerZoomed.value = false;
  imageViewerIndex.value = (imageViewerIndex.value + 1) % images.length;
};
const showPreviousViewerImage = () => {
  const setId = imageViewerSetId.value;
  if (setId === null) return;
  const images = getImagesForSet(setId);
  if (images.length < 2) return;
  imageViewerZoomed.value = false;
  imageViewerIndex.value = (imageViewerIndex.value - 1 + images.length) % images.length;
};

const openImageManager = (setId: string) => {
  imageManagerSetId.value = setId;
  imageUrlInput.value = '';
  imageUrlError.value = null;
  scrapeResult.value = null;
  scrapeError.value = null;
};
const closeImageManager = () => {
  imageManagerSetId.value = null;
};

const uploadMode = ref<'file' | 'url' | 'html'>('file');
const scrapeForm = reactive({ rawHtml: '', baseUrl: '' });
const scrapeLoading = ref(false);
const scrapeResult = ref<{ found: number; downloaded: number; skipped: number } | null>(null);
const scrapeError = ref<string | null>(null);

const imageUrlInput = ref('');
const imageUrlUploading = ref(false);
const imageUrlError = ref<string | null>(null);

const uploadImageFromUrl = async (setId: string) => {
  imageUrlError.value = null;
  imageUrlUploading.value = true;
  try {
    const response = await fetch(`/api/sets/${setId}/images/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: imageUrlInput.value })
    });
    const data = await response.json();
    if (!response.ok) {
      imageUrlError.value = data.error || 'Upload failed';
      return;
    }
    imageUrlInput.value = '';
    await fetchSetImages(setId);
  } catch (error) {
    imageUrlError.value = 'Network error';
    console.error('URL upload failed', error);
  } finally {
    imageUrlUploading.value = false;
  }
};

const scrapeImages = async (setId: string) => {
  scrapeResult.value = null;
  scrapeError.value = null;
  scrapeLoading.value = true;
  try {
    const payload = { rawHtml: scrapeForm.rawHtml, baseUrl: scrapeForm.baseUrl || undefined };
    const response = await fetch(`/api/sets/${setId}/images/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      scrapeError.value = data.error || 'Scraping failed';
      return;
    }
    scrapeResult.value = { found: data.found, downloaded: data.downloaded, skipped: data.skipped };
    if (data.downloaded > 0) {
      await fetchSetImages(setId);
    }
  } catch (error) {
    scrapeError.value = 'Network error while scraping';
    console.error('Scrape failed', error);
  } finally {
    scrapeLoading.value = false;
  }
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

const deletingAllImages = ref(false);
const deleteAllConfirming = ref(false);
let deleteAllTimer: ReturnType<typeof setTimeout> | null = null;

const deleteAllImages = async (setId: string) => {
  if (!deleteAllConfirming.value) {
    deleteAllConfirming.value = true;
    deleteAllTimer = setTimeout(() => { deleteAllConfirming.value = false; }, 3000);
    return;
  }
  if (deleteAllTimer) { clearTimeout(deleteAllTimer); deleteAllTimer = null; }
  deleteAllConfirming.value = false;
  deletingAllImages.value = true;
  try {
    const response = await fetch(`/api/sets/${setId}/images`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete all images');
    await fetchSetImages(setId);
  } catch (error) {
    console.error('Failed to delete all images', error);
  } finally {
    deletingAllImages.value = false;
  }
};

const deletingSet = ref(false);
const deleteSetConfirming = ref(false);
let deleteSetTimer: ReturnType<typeof setTimeout> | null = null;

const deleteSet = async (setId: string) => {
  if (!deleteSetConfirming.value) {
    deleteSetConfirming.value = true;
    deleteSetTimer = setTimeout(() => { deleteSetConfirming.value = false; }, 4000);
    return;
  }
  if (deleteSetTimer) { clearTimeout(deleteSetTimer); deleteSetTimer = null; }
  deleteSetConfirming.value = false;
  deletingSet.value = true;
  try {
    const response = await fetch(`/api/sets/${setId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete set');
    closeFormOverlay();
    await loadSets();
  } catch (error) {
    console.error('Failed to delete set', error);
  } finally {
    deletingSet.value = false;
  }
};

const editingSet = computed(() =>
  editingId.value ? sets.value.find((s) => s.id === editingId.value) ?? null : null
);
const moveOverlayVisible = ref(false);
const movePurchasePrice = ref('');
const movingSet = ref(false);

const openMoveOverlay = () => {
  const set = editingSet.value;
  movePurchasePrice.value = set?.purchasePrice != null ? formatWithComma(set.purchasePrice, 2) : '';
  moveOverlayVisible.value = true;
};

const moveToCollection = async () => {
  if (!editingId.value) return;
  movingSet.value = true;
  try {
    const body: Record<string, unknown> = { listType: 'collection' };
    if (movePurchasePrice.value !== '') {
      body.purchasePrice = parseDecimalString(movePurchasePrice.value);
    }
    const response = await fetch(`/api/sets/${editingId.value}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Failed to move set');
    moveOverlayVisible.value = false;
    closeFormOverlay();
    await loadSets();
  } catch (error) {
    console.error('Failed to move set', error);
  } finally {
    movingSet.value = false;
  }
};

const cycleSetStatus = async (set: BrickSet) => {
  const idx = statuses.indexOf(set.status);
  const nextStatus = statuses[(idx + 1) % statuses.length];
  try {
    const response = await fetch(`/api/sets/${set.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    if (!response.ok) throw new Error('Failed to update status');
    const updated = await response.json();
    const i = sets.value.findIndex((s) => s.id === set.id);
    if (i !== -1) sets.value[i] = updated;
  } catch (error) {
    console.error('Failed to cycle status', error);
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
  pricePerPiece: string;
  hasOriginalBox: boolean;
  hasPrintedPhoto: boolean;
  year: string;
  notes: string;
  instructionsUrl: string;
  retiredProduct: boolean;
  theme: string;
};

const createEmptyForm = (): FormPayload => ({
  manufacturer: '',
  setName: '',
  setNumber: '',
  legoReferenceNumber: '',
  brickSize: 'Standard',
  status: statuses[0],
  purchasePrice: '',
  pieceCount: '',
  pricePerPiece: '',
  hasOriginalBox: false,
  hasPrintedPhoto: false,
  year: '',
  notes: '',
  instructionsUrl: '',
  retiredProduct: false,
  theme: ''
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

const handleDecimalInput = (field: 'purchasePrice' | 'pricePerPiece', rawValue: string) => {
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
  nextTick(() => formOverlayRef.value?.focus());
};

const closeFormOverlay = () => {
  clearFormFields();
  isFormOverlayVisible.value = false;
  deleteSetConfirming.value = false;
};

const formatWithComma = (value: number, digits: number) => {
  return value.toFixed(digits).replace('.', ',');
};

const formatSetNumber = (set: BrickSet) => {
  if (set.legoReferenceNumber) {
    return set.setNumber
      ? `#${set.legoReferenceNumber} (#${set.setNumber})`
      : `#${set.legoReferenceNumber}`;
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
  theme: '',
  status: '',
  brickSize: '',
  hasOriginalBox: false,
  retiredProduct: false,
  hasPrintedPhoto: false,
  hasInstructions: false
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
  filters.theme = '';
  filters.status = '';
  filters.brickSize = '';
  filters.hasOriginalBox = false;
  filters.retiredProduct = false;
  filters.hasPrintedPhoto = false;
  filters.hasInstructions = false;
  sortField.value = 'setName';
  sortDirection.value = 'asc';
};

const toggleChipFilter = (key: 'hasOriginalBox' | 'retiredProduct' | 'hasPrintedPhoto' | 'hasInstructions') => {
  filters[key] = !filters[key];
};

const filteredSets = computed(() => {
  let result = activeSets.value.slice();

  if (filters.manufacturer) {
    result = result.filter(
      (set) => set.manufacturer?.toLowerCase() === filters.manufacturer.toLowerCase()
    );
  }
  if (filters.theme) {
    result = result.filter((set) => set.theme === filters.theme);
  }
  if (filters.status) {
    result = result.filter((set) => set.status === filters.status);
  }
  if (filters.brickSize) {
    result = result.filter((set) => set.brickSize === filters.brickSize);
  }
  if (filters.hasOriginalBox) {
    result = result.filter((set) => set.hasOriginalBox);
  }
  if (filters.retiredProduct) {
    result = result.filter((set) => set.retiredProduct);
  }
  if (filters.hasPrintedPhoto) {
    result = result.filter((set) => set.hasPrintedPhoto);
  }
  if (filters.hasInstructions) {
    result = result.filter((set) => !!set.instructionsUrl);
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

const collectionStats = computed(() => {
  const all = filteredSets.value;
  const newSets = all.filter((s) => s.status === 'New' || s.status === 'Building').length;
  const builtSets = all.filter((s) => s.status === 'Built' || s.status === 'Disassembled' || s.status === 'Sold').length;
  const priced = all.filter((s) => s.purchasePrice != null);
  const totalPrice = priced.reduce((sum, s) => sum + s.purchasePrice!, 0);
  const totalPieces = all.reduce((sum, s) => sum + (s.pieceCount ?? 0), 0);
  const pricedPieces = priced.reduce((sum, s) => sum + (s.pieceCount ?? 0), 0);
  const avgPricePerPiece = pricedPieces > 0 ? totalPrice / pricedPieces : null;
  return {
    newSets,
    builtSets,
    totalPrice: priced.length > 0 ? totalPrice : null,
    totalPieces: totalPieces > 0 ? totalPieces : null,
    avgPricePerPiece
  };
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

const editTab = ref<'general' | 'details'>('general');

const startEditing = (set: BrickSet) => {
  editingId.value = set.id;
  editTab.value = 'general';
  form.value = {
    manufacturer: set.manufacturer,
    setName: set.setName,
    setNumber: set.setNumber ?? '',
    legoReferenceNumber: set.legoReferenceNumber ?? '',
    brickSize: set.brickSize ?? 'Standard',
    status: set.status,
    purchasePrice:
      set.purchasePrice != null ? formatWithComma(set.purchasePrice, 2) : '',
    pieceCount: set.pieceCount != null ? String(set.pieceCount) : '',
    pricePerPiece: set.pricePerPiece != null ? formatWithComma(set.pricePerPiece, 4) : '',
    hasOriginalBox: set.hasOriginalBox ?? false,
    hasPrintedPhoto: set.hasPrintedPhoto ?? false,
    year: set.year != null ? String(set.year) : '',
    notes: set.notes ?? '',
    instructionsUrl: set.instructionsUrl ?? '',
    retiredProduct: set.retiredProduct ?? false,
    theme: set.theme ?? ''
  };
  isFormOverlayVisible.value = true;
  nextTick(() => formOverlayRef.value?.focus());
};

const saveSet = async () => {
  if (!form.value.manufacturer || !form.value.setName) {
    return;
  }
  submitting.value = true;
  try {
    const pieceCount = form.value.pieceCount === '' ? null : Number(form.value.pieceCount);
    let purchasePrice: number | null;
    const isWishlistItem = editingId.value ? editingSet.value?.listType === 'wishlist' : activeTab.value === 'wishlist';
    if (isWishlistItem) {
      const ppp = form.value.pricePerPiece === '' ? null : parseDecimalString(form.value.pricePerPiece);
      purchasePrice = ppp != null && pieceCount ? ppp * pieceCount : null;
    } else {
      purchasePrice = form.value.purchasePrice === '' ? null : parseDecimalString(form.value.purchasePrice);
    }
    const payload: Record<string, unknown> = {
      manufacturer: form.value.manufacturer,
      setName: form.value.setName,
      setNumber: form.value.setNumber || null,
      legoReferenceNumber: form.value.legoReferenceNumber || null,
      brickSize: brickSizes.includes(form.value.brickSize)
        ? form.value.brickSize
        : 'Standard',
      status: form.value.status,
      purchasePrice,
      pieceCount,
      listType: editingId.value ? undefined : activeTab.value
    };
    if (editingId.value) {
      payload.hasOriginalBox = form.value.hasOriginalBox;
      payload.hasPrintedPhoto = form.value.hasPrintedPhoto;
      payload.year = form.value.year === '' ? null : Number(form.value.year);
      payload.notes = form.value.notes || null;
      payload.instructionsUrl = form.value.instructionsUrl || null;
      payload.retiredProduct = form.value.retiredProduct;
      payload.theme = form.value.theme || null;
    }

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

const isDark = ref(false);
const applyDarkMode = (dark: boolean) => {
  isDark.value = dark;
  document.documentElement.classList.toggle('dark', dark);
};
const toggleDarkMode = () => {
  const next = !isDark.value;
  applyDarkMode(next);
  localStorage.setItem('brick-library-dark', next ? '1' : '0');
};

onMounted(async () => {
  const stored = localStorage.getItem('brick-library-dark');
  if (stored !== null) {
    applyDarkMode(stored === '1');
  } else {
    applyDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  window.addEventListener('resize', updateIsMobileLayout);
  updateIsMobileLayout();

  loadSets();
});

  const configVersionMatch = configText.match(/version:\s*["']([^"']+)["']/)
  const appVersion = configVersionMatch?.[1] ?? 'unknown'
</script>

<style scoped>
:global(:root) {
  --bg-page: linear-gradient(160deg, #e8ecf1 0%, #f0f2f5 40%, #eae4da 100%);
  --bg-card: rgba(255, 255, 255, 0.9);
  --bg-surface: #fff;
  --bg-surface-rgba: rgba(255, 255, 255, 0.35);
  --bg-elevated: #f8fafc;
  --bg-inset: #f1f5f9;
  --bg-subtle: rgba(15, 23, 42, 0.06);
  --bg-overlay: rgba(15, 23, 42, 0.65);
  --bg-overlay-heavy: rgba(15, 23, 42, 0.7);
  --bg-toggle: #cbd5e1;
  --bg-toggle-knob: #fff;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #64748b;
  --text-muted: #94a3b8;
  --text-strong: #334155;

  --border-light: rgba(15, 23, 42, 0.08);
  --border-default: rgba(15, 23, 42, 0.1);
  --border-medium: rgba(15, 23, 42, 0.15);
  --border-input: rgba(15, 23, 42, 0.2);
  --border-dashed: rgba(15, 23, 42, 0.3);

  --accent: #e96f14;
  --accent-soft: rgba(233, 111, 20, 0.14);
  --accent-text: #fff;
  --accent-border: #ffd502;

  --shadow-card: 0 15px 35px rgba(15, 23, 42, 0.1);
  --shadow-button: 0 8px 16px rgba(15, 23, 42, 0.1);
  --shadow-button-hover: 0 10px 18px rgba(15, 23, 42, 0.15);
  --shadow-gear: 0 2px 8px rgba(15, 23, 42, 0.12);
  --shadow-viewer: 0 25px 50px rgba(0, 0, 0, 0.35);
  --shadow-nav: 0 10px 20px rgba(0, 0, 0, 0.15);

  --color-danger: #dc2626;
  --bg-danger-soft: #fee2e2;
  --bg-danger-hover: #fef2f2;
  --border-danger: #fecaca;

  --color-success: #16a34a;
  --bg-success-soft: #f0fdf4;

  --status-new-bg: #dbeafe;
  --status-new-text: #1e40af;
  --status-building-bg: #fef3c7;
  --status-building-text: #92400e;
  --status-built-bg: #d1fae5;
  --status-built-text: #065f46;
  --status-sold-bg: #f1f5f9;
  --status-sold-text: #64748b;
  --status-default-bg: #e2e8f0;

  --chip-instructions-bg: rgba(233, 111, 20, 0.12);
  --chip-instructions-text: #e96f14;
  --chip-instructions-bg-hover: rgba(233, 111, 20, 0.22);
  --chip-instructions-text-hover: #c75d0e;
  --chip-retired-bg: rgba(189, 0, 0, 0.1);
  --chip-retired-text: #bd0000;
  --chip-retired-bg-hover: rgba(189, 0, 0, 0.2);
  --chip-retired-text-hover: #9a0000;
  --chip-info-bg: rgba(30, 64, 175, 0.1);
  --chip-info-text: #1e40af;
  --chip-info-bg-hover: rgba(30, 64, 175, 0.18);
  --chip-info-text-hover: #1a3794;
}

:global(.dark) {
  --bg-page: linear-gradient(160deg, #0f172a 0%, #111d32 40%, #1a1525 100%);
  --bg-card: rgba(30, 41, 59, 0.95);
  --bg-surface: #1e293b;
  --bg-surface-rgba: rgb(30, 41, 59, 0.35);
  --bg-elevated: #1e293b;
  --bg-inset: #0f172a;
  --bg-subtle: rgba(148, 163, 184, 0.1);
  --bg-overlay: rgba(0, 0, 0, 0.75);
  --bg-overlay-heavy: rgba(0, 0, 0, 0.8);
  --bg-toggle: #475569;
  --bg-toggle-knob: #e2e8f0;

  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-tertiary: #94a3b8;
  --text-muted: #64748b;
  --text-strong: #cbd5e1;

  --border-light: rgba(148, 163, 184, 0.1);
  --border-default: rgba(148, 163, 184, 0.12);
  --border-medium: rgba(148, 163, 184, 0.18);
  --border-input: rgba(148, 163, 184, 0.25);
  --border-dashed: rgba(148, 163, 184, 0.35);

  --accent: #ea580c;
  --accent-soft: rgba(234, 88, 12, 0.2);
  --accent-text: #fff;
  --accent-border: #ffd502;

  --shadow-card: 0 15px 35px rgba(0, 0, 0, 0.3);
  --shadow-button: 0 8px 16px rgba(0, 0, 0, 0.25);
  --shadow-button-hover: 0 10px 18px rgba(0, 0, 0, 0.35);
  --shadow-gear: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-viewer: 0 25px 50px rgba(0, 0, 0, 0.6);
  --shadow-nav: 0 10px 20px rgba(0, 0, 0, 0.35);

  --color-danger: #f87171;
  --bg-danger-soft: rgba(248, 113, 113, 0.15);
  --bg-danger-hover: rgba(248, 113, 113, 0.1);
  --border-danger: rgba(248, 113, 113, 0.3);

  --color-success: #4ade80;
  --bg-success-soft: rgba(74, 222, 128, 0.1);

  --status-new-bg: rgba(59, 130, 246, 0.2);
  --status-new-text: #60a5fa;
  --status-building-bg: rgba(251, 191, 36, 0.2);
  --status-building-text: #fbbf24;
  --status-built-bg: rgba(52, 211, 153, 0.2);
  --status-built-text: #34d399;
  --status-sold-bg: rgba(148, 163, 184, 0.15);
  --status-sold-text: #94a3b8;
  --status-default-bg: rgba(148, 163, 184, 0.2);

  --chip-instructions-bg: rgba(233, 111, 20, 0.2);
  --chip-instructions-text: #fb923c;
  --chip-instructions-bg-hover: rgba(233, 111, 20, 0.3);
  --chip-instructions-text-hover: #fdba74;
  --chip-retired-bg: rgba(248, 113, 113, 0.15);
  --chip-retired-text: #f87171;
  --chip-retired-bg-hover: rgba(248, 113, 113, 0.25);
  --chip-retired-text-hover: #fca5a5;
  --chip-info-bg: rgba(96, 165, 250, 0.15);
  --chip-info-text: #60a5fa;
  --chip-info-bg-hover: rgba(96, 165, 250, 0.25);
  --chip-info-text-hover: #93c5fd;
}

:global(body) {
  margin: 0;
  background: var(--bg-page);
  background-attachment: fixed;
  min-height: 100vh;
  color: var(--text-primary);
  transition: color 0.2s;
}

.page {
  min-height: 100vh;
  padding: 2rem;
  position: relative;
}

.app-footer {
  position: fixed;
  bottom: 0.5rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 10;
}

.app-version {
  font-size: 0.65rem;
  color: var(--text-muted);
  pointer-events: none;
}

.dark-mode-toggle {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-gear);
  transition: transform 0.2s;
  color: inherit;
  filter: grayscale(1) saturate(0);
}

.dark-mode-toggle:hover {
  transform: scale(1.1);
}

.hero {
  text-align: center;
  margin-bottom: 2rem;
}

.eyebrow {
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--text-primary);
}

.page-tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border-default);
}

.page-tabs button {
  padding: 0.35rem 0.75rem;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  border-radius: 0;
}

.page-tabs button.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent-border);
}

.form-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1rem;
}

.content-grid {
  display: grid;
  gap: 1rem;
}

.card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-card);
}

.form-card button:not(.delete-set-button) button:not(.icon-button) {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  border-bottom: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.form-card button:not(.delete-set-button):hover button:not(.tab-button):hover {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.text-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 0.5rem;
  cursor: pointer;
}

.move-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

.move-price-label {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.move-price-label input {
  padding: 0.65rem;
  margin-top: 0.15rem;
  border-radius: 0.65rem;
  border: 1px solid var(--border-input);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.overlay-card .primary-button {
  width: 100%;
  padding: 0.5rem;
  border-radius: 0.6rem;
  font-size: 0.8rem;
}

.move-confirm-button {
  width: 100%;
}

.delete-set-button {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-danger);
  border-radius: 0.6rem;
  background: var(--bg-surface);
  color: var(--color-danger);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.delete-set-button:hover {
  background: var(--bg-danger-hover);
}

.delete-set-button.confirming {
  background: var(--color-danger);
  color: #fff;
  border-color: var(--color-danger);
  font-weight: 600;
}

.delete-set-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.link-button {
  margin-top: 0.75rem;
  background: none;
  border: none;
  color: var(--text-primary);
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
  padding: 0.5rem 0.65rem;
  margin-top: 0.15rem;
  border-radius: 0.65rem;
  border: 1px solid var(--border-input);
  background: var(--bg-surface);
  color: var(--text-primary);
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

.form-grid .full-width {
  grid-column: 1 / -1;
}

.form-card textarea {
  width: 100%;
  padding: 0.65rem;
  margin-top: 0.15rem;
  border-radius: 0.65rem;
  border: 1px solid var(--border-input);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}

.form-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--border-default);
}

.form-tabs button {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  background: none;
  font-size: 0.9rem;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  border-radius: 0px;
}

.form-tabs button.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent-border);
  font-weight: 600;
}

.toggle-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--bg-toggle);
  border-radius: 24px;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: var(--bg-toggle-knob);
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.list-card {
  position: relative;
}

.add-button {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  z-index: 10;
}

.add-button:hover {
  background: var(--accent);
  color: var(--accent-text);
}

.controls-card {
  padding: 0.75rem 1.25rem;
}

.stats-card {
  padding: 0.75rem 1.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1.25rem;
  margin: 0;
}

.stats-grid div {
  text-align: center;
}

.stats-grid dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.stats-grid dd {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}
.controls-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.chip-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.controls-label {
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: var(--bg-subtle);
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
}

.chip {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  position: relative;
  color: var(--text-primary);
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

.filter-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.filter-chip span {
  pointer-events: none;
}

.filter-chip.active {
  border-color: var(--chip-instructions-text);
  background: var(--chip-instructions-bg);
  color: var(--chip-instructions-text);
}

.sort-chips {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.sort-chip {
  border: 1px solid var(--border-medium);
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--bg-surface);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  flex-direction: row;
}

.sort-chip.active {
  border-color: var(--chip-instructions-text);
  background: var(--chip-instructions-bg);
  color: var(--chip-instructions-text);
}

.sort-direction {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.reset-chip {
  border: 1px solid var(--border-medium);
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.6rem;
  background: var(--bg-surface);
  cursor: pointer;
  color: var(--color-danger);
  margin-left: auto;
}

.reset-chip:hover {
  border: 1px solid var(--border-danger);
  background: var(--bg-danger-soft);
  transition: filter 0.2s ease;
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
  color: var(--text-secondary);
}

.primary-button {
  border: 1px solid var(--border-default);
  border-radius: 0.9rem;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

}

.form-card button.primary-button {
  margin-top: 1rem;
}

.form-card button.primary-button:hover,
.upload-panel button.primary-button:hover {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.form-card button.delete-set-button {
  margin-top: 1rem;
}

.set-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(1, 1fr);
}

@media (min-width: 768px) {
  .set-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1750px) {
  .set-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.set-card {
  padding: 1rem;
  border-radius: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  cursor: pointer;
}

.set-card__layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  align-items: stretch;
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
  box-shadow: inset 0 0 0 1px var(--border-light);
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
  background: var(--bg-inset);
  border: 1px dashed var(--border-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.manage-images-gear {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: 50%;
  border: 1px solid transparent;
  background: var(--bg-surface);
  box-shadow: var(--shadow-gear);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  opacity: 0;
  transition: opacity 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
  z-index: 2;
}

.manage-images-gear__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  font-size: 1.05rem;
  line-height: 1;
  top: -1px;
  position: relative;
  left: 0.5px;
}

.manage-images-gear:hover {
  border-color: #fb923c;
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
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

.image-gallery-empty {
  font-size: 0.85rem;
  color: var(--text-tertiary);
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
  border: 1px dashed var(--border-dashed);
  font-size: 0.85rem;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
}

.image-upload-input input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.image-upload-form .primary-button {
  font-size: 0.8rem;
  padding: 0.5rem;
  border-radius: 0.6rem;
}

.image-manager-card {
  width: min(520px, 100%);
}

.image-manager-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid var(--accent-border);
  padding-top: 0.75rem;
  margin-top: 0.25rem;
}

.image-manager-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
}

.image-manager-item img {
  width: 80px;
  height: 60px;
  object-fit: contain;
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
  color: var(--text-strong);
}

.image-manager-item-source {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.image-manager-item-meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
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
  border: 1px solid var(--border-medium);
  border-radius: 0.3rem;
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 0.55rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: background 0.15s ease;
}

.image-sort-button:hover:not(:disabled) {
  background: var(--bg-inset);
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
  background: var(--bg-danger-soft);
  color: var(--color-danger);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.image-manager-delete:hover {
  background: var(--border-danger);
}

.image-manager-delete:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.delete-all-button {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  border: 1px solid var(--border-danger);
  border-radius: 0.6rem;
  background: var(--bg-surface);
  color: var(--color-danger);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.delete-all-button:hover {
  background: var(--bg-danger-hover);
}

.delete-all-button.confirming {
  background: var(--color-danger);
  color: #fff;
  border-color: var(--color-danger);
  font-weight: 600;
}

.delete-all-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.upload-tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border-default);
  margin-bottom: 0.75rem;
}

.upload-tabs button {
  padding: 0.35rem 0.75rem;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  border-radius: 0;
}

.upload-tabs button.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent-border);
}

.upload-panel {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.upload-panel input[type="url"] {
  padding: 0.55rem 0.7rem;
  border-radius: 0.6rem;
  border: 1px solid var(--border-input);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.upload-panel label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.label-hint {
  font-weight: 400;
  color: var(--text-muted);
}

.upload-panel textarea {
  padding: 0.55rem 0.7rem;
  border-radius: 0.6rem;
  border: 1px solid var(--border-input);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.78rem;
  line-height: 1.5;
  resize: vertical;
}

.upload-panel input[type="url"]:last-of-type {
  font-family: inherit;
}

.upload-panel .primary-button {
  font-size: 0.8rem;
  padding: 0.5rem;
  border-radius: 0.6rem;
}

.upload-success {
  font-size: 0.8rem;
  color: var(--color-success);
  padding: 0.4rem 0.6rem;
  background: var(--bg-success-soft);
  border-radius: 0.5rem;
}

.upload-error {
  font-size: 0.8rem;
  color: var(--color-danger);
  padding: 0.4rem 0.6rem;
  background: var(--bg-danger-hover);
  border-radius: 0.5rem;
}

.carousel-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: none;
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-button);
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
  box-shadow: var(--shadow-button-hover);
}

.set-card__details {
  display: flex;
  flex-direction: column;
  margin-left: 1rem;
}

.set-card__actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
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
  color: var(--text-secondary);
}

.set-card__status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--status-default-bg);
  color: var(--text-strong);
  cursor: pointer;
}

.set-card__status[data-status="New"] {
  background: var(--status-new-bg);
  color: var(--status-new-text);
}

.set-card__status[data-status="Building"] {
  background: var(--status-building-bg);
  color: var(--status-building-text);
}

.set-card__status[data-status="Built"] {
  background: var(--status-built-bg);
  color: var(--status-built-text);
}

.set-card__status[data-status="Disassembled"] {
  background: var(--status-built-bg);
  color: var(--status-built-text);
}

.set-card__status[data-status="Sold"] {
  background: var(--status-sold-bg);
  color: var(--status-sold-text);
}

.set-card__name {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 600;
}

.set-card__year {
  font-weight: 400;
  color: var(--text-tertiary);
  margin-left: 0.35em;
  font-size: 0.95em;
}

.set-card__number {
  margin: 0.15rem 0;
  font-size: 0.75rem;
  color: var(--text-muted);
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
  color: var(--text-muted);
}

.set-card__meta dd {
  margin: 0;
  font-weight: 600;
  font-size: 0.85em;
}

.set-card__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.5rem;
}

.set-card__chips-spacer {
  flex: 1;
}

.detail-chip {
  display: inline-block;
  width: fit-content;
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-tertiary);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.detail-chip:hover {
  background: var(--border-medium);
  color: var(--text-strong);
}

.detail-chip.active {
  background: var(--accent);
  color: var(--accent-text);
}

.detail-chip--instructions {
  background: var(--chip-instructions-bg);
  color: var(--chip-instructions-text);
}

.detail-chip--instructions:hover {
  background: var(--chip-instructions-bg-hover);
  color: var(--chip-instructions-text-hover);
}

.detail-chip--retired {
  background: var(--chip-retired-bg);
  color: var(--chip-retired-text);
}

.detail-chip--retired:hover {
  background: var(--chip-retired-bg-hover);
  color: var(--chip-retired-text-hover);
}

.detail-chip--info {
  background: var(--chip-info-bg);
  color: var(--chip-info-text);
}

.detail-chip--info:hover {
  background: var(--chip-info-bg-hover);
  color: var(--chip-info-text-hover);
}

.empty {
  padding: 1rem 0;
  color: var(--text-secondary);
}

.overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
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

.overlay-header__actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.move-icon-button {
  color: var(--status-built-text) !important;
  font-size: 1.2rem;
  transition: background 0.15s, color 0.15s;
}

.move-icon-button:hover {
  background: var(--status-built-bg);
}

.overlay-header h2 {
  margin: 0;
}

.icon-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-input);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.icon-button:hover {
  background: var(--bg-inset);
  border-color: var(--border-medium);
}

.image-viewer-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay-heavy);
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
  background: var(--bg-surface);
  border-radius: 1rem;
  padding: 1.5rem 2rem;
  box-shadow: var(--shadow-viewer);
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
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-nav);
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
  cursor: zoom-in;
  transition: max-height 0.2s ease;
}

.zoomed {
  overflow: hidden;
}

.zoomed .image-viewer-img {
  cursor: grab;
  transition: none;
  user-select: none;
}

.zoomed .image-viewer-img.dragging {
  cursor: grabbing;
}

.image-viewer-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.image-viewer-counter {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: var(--bg-surface);
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  letter-spacing: 0.05em;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

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

  .controls-bar {
    flex-direction: column;
  }

  .set-card__image-controls {
    opacity: 1;
  }
  .manage-images-gear {
    opacity: 1;
  }
  .set-card__image-wrapper:hover .manage-images-gear {
    opacity: 1;
  }

  .carousel-button {
    background-color: var(--bg-surface-rgba);
  }

  .image-viewer-prev {
    left: -1.2rem;
  }
  
  .reset-chip {
    margin-left: 0;
  }
}

</style>
