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
      <button
        type="button"
        :class="{ active: activeTab === 'kids' }"
        @click="activeTab = 'kids'"
      >Kids</button>
    </nav>
    <KidsApp v-if="activeTab === 'kids'" ref="kidsAppRef" />
    <template v-else>

    <!-- Mobile: search + filter row -->
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
      <button
        type="button"
        class="mobile-filter-btn"
        :class="{ active: activeFilterCount > 0 }"
        @click="mobileFilterDrawerOpen = true"
        aria-label="Open filters"
      >
        <span>Filter</span>
        <span v-if="activeFilterCount > 0" class="mobile-filter-badge">{{ activeFilterCount }}</span>
      </button>
    </div>

    <!-- Mobile: count + layout switcher row -->
    <div v-if="isMobileLayout" class="mobile-summary-bar">
      <span class="mobile-summary-text">
        {{ displayedSets.length }} {{ activeTab === 'wishlist' ? 'Items' : 'Sets' }}<template v-if="collectionStats.totalPrice !== null"> · {{ formatPrice(collectionStats.totalPrice) }}</template><template v-if="collectionStats.totalPieces !== null"> · {{ collectionStats.totalPieces.toLocaleString() }} Steine</template>
      </span>
      <div class="mobile-layout-switcher">
        <button
          type="button"
          class="mobile-layout-btn"
          :class="{ active: layoutMode === 'card' }"
          @click="layoutMode = 'card'"
          aria-label="Gallery view"
        >&#9638;</button>
        <button
          type="button"
          class="mobile-layout-btn"
          :class="{ active: layoutMode === 'list' }"
          @click="layoutMode = 'list'"
          aria-label="List view"
        >&#8801;</button>
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
      <div class="toolbar-popover-anchor" ref="filterPopoverRef">
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': activeFilterCount > 0 }"
          @click="desktopFilterPanelOpen = !desktopFilterPanelOpen"
        >
          Filters<span v-if="activeFilterCount > 0" class="toolbar-badge">{{ activeFilterCount }}</span>
        </button>
        <div v-if="desktopFilterPanelOpen" class="desktop-filter-panel">
          <div class="desktop-filter-grid">
            <div class="desktop-filter-col">
              <span class="desktop-filter-label">Manufacturer</span>
              <select v-model="filters.manufacturer" class="desktop-filter-select">
                <option value="">All</option>
                <option v-for="m in activeManufacturers" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
            <div class="desktop-filter-col">
              <span class="desktop-filter-label">Theme</span>
              <select v-model="filters.theme" class="desktop-filter-select">
                <option value="">All</option>
                <option v-for="t in activeThemes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="desktop-filter-col">
              <span class="desktop-filter-label">Status</span>
              <select v-model="filters.status" class="desktop-filter-select">
                <option value="">All</option>
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="desktop-filter-col">
              <span class="desktop-filter-label">Size</span>
              <select v-model="filters.brickSize" class="desktop-filter-select">
                <option value="">All</option>
                <option v-for="sz in brickSizes" :key="sz" :value="sz">{{ sz }}</option>
              </select>
            </div>
          </div>
          <div class="desktop-filter-toggles">
            <button type="button" class="filter-toggle-chip" :class="{ active: filters.hasLegoNumber }" @click="toggleChipFilter('hasLegoNumber')">LEGO #</button>
            <button type="button" class="filter-toggle-chip" :class="{ active: filters.hasOriginalBox }" @click="toggleChipFilter('hasOriginalBox')">Box</button>
            <button type="button" class="filter-toggle-chip" :class="{ active: filters.retiredProduct }" @click="toggleChipFilter('retiredProduct')">Retired</button>
            <button type="button" class="filter-toggle-chip" :class="{ active: filters.hasPrintedPhoto }" @click="toggleChipFilter('hasPrintedPhoto')">Photo</button>
            <button type="button" class="filter-toggle-chip" :class="{ active: filters.hasInstructions }" @click="toggleChipFilter('hasInstructions')">Instructions</button>
          </div>
          <div class="desktop-filter-footer">
            <button type="button" class="desktop-filter-reset" @click="resetFilters()">Reset</button>
            <button type="button" class="desktop-filter-done" @click="desktopFilterPanelOpen = false">Done</button>
          </div>
        </div>
      </div>
      <div class="toolbar-popover-anchor" ref="sortPopoverRef">
        <button
          type="button"
          class="toolbar-btn toolbar-sort-btn"
          @click="desktopSortPanelOpen = !desktopSortPanelOpen"
        >
          Sort: {{ currentSortLabel }}&thinsp;<span class="sort-dir-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
        </button>
        <div v-if="desktopSortPanelOpen" class="desktop-sort-panel">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            type="button"
            class="desktop-sort-option"
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
      <button type="button" class="toolbar-add-btn" @click="openAddForm">
        + {{ activeTab === 'wishlist' ? 'Add to Wishlist' : 'Add Set' }}
      </button>
    </div>

    <!-- Desktop: compact stats row -->
    <div v-if="!isMobileLayout && displayedSets.length > 0" class="desktop-stats-row">
      <span>{{ displayedSets.length }} {{ activeTab === 'wishlist' ? 'Items' : 'Sets' }}</span>
      <template v-if="collectionStats.totalPrice !== null">
        <span class="desktop-stats-sep">·</span>
        <span>{{ formatPrice(collectionStats.totalPrice) }} total</span>
      </template>
      <template v-if="collectionStats.totalPieces !== null">
        <span class="desktop-stats-sep">·</span>
        <span>{{ collectionStats.totalPieces.toLocaleString() }} pieces</span>
      </template>
      <template v-if="collectionStats.avgPricePerPiece !== null">
        <span class="desktop-stats-sep">·</span>
        <span class="desktop-stats-secondary">{{ formatCents(collectionStats.avgPricePerPiece) }} avg/piece</span>
      </template>
    </div>

    <!-- Desktop: active filter chips row (only when filters active) -->
    <div v-if="!isMobileLayout && activeFilterCount > 0" class="desktop-active-filters">
      <span v-if="filters.manufacturer" class="active-chip">{{ filters.manufacturer }}<button type="button" @click="filters.manufacturer = ''">×</button></span>
      <span v-if="filters.theme" class="active-chip">{{ filters.theme }}<button type="button" @click="filters.theme = ''">×</button></span>
      <span v-if="filters.status" class="active-chip">{{ filters.status }}<button type="button" @click="filters.status = ''">×</button></span>
      <span v-if="filters.brickSize" class="active-chip">{{ filters.brickSize }}<button type="button" @click="filters.brickSize = ''">×</button></span>
      <span v-if="filters.hasLegoNumber" class="active-chip">LEGO #<button type="button" @click="toggleChipFilter('hasLegoNumber')">×</button></span>
      <span v-if="filters.hasOriginalBox" class="active-chip">Box<button type="button" @click="toggleChipFilter('hasOriginalBox')">×</button></span>
      <span v-if="filters.retiredProduct" class="active-chip">Retired<button type="button" @click="toggleChipFilter('retiredProduct')">×</button></span>
      <span v-if="filters.hasPrintedPhoto" class="active-chip">Photo<button type="button" @click="toggleChipFilter('hasPrintedPhoto')">×</button></span>
      <span v-if="filters.hasInstructions" class="active-chip">Instructions<button type="button" @click="toggleChipFilter('hasInstructions')">×</button></span>
      <button type="button" class="active-chip-clear" @click="resetFilters">Clear all</button>
    </div>

    <section class="card list-card">
      <div v-if="displayedSets.length === 0" class="empty">
        {{ activeSets.length === 0
          ? (activeTab === 'wishlist' ? 'No wishlist items yet.' : 'No sets yet. Add one to start tracking your library.')
          : 'No sets match the active filters.' }}
      </div>
      <template v-else-if="layoutMode === 'card'">
        <!-- Mobile gallery: 2-column image-first grid -->
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
                @error="(e) => { const t = (e.target as HTMLImageElement); const fb = t.dataset.fallback; if (fb) t.src = fb; }"
              />
              <div v-else class="mobile-gallery-img-empty"></div>
            </div>
            <p class="mobile-gallery-name">{{ set.setName }}</p>
          </button>
        </div>
        <!-- Desktop card grid -->
        <div v-else class="set-grid">
        <article
          v-for="set in displayedSets"
          :key="set.id"
          class="set-card"
          @click="openDesktopDetail(set)"
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
                @error="(e) => { const t = (e.target as HTMLImageElement); const fb = t.dataset.fallback; if (fb) t.src = fb; }"
              />
              <div class="set-card__image-controls" v-if="getImagesForSet(set.id).length > 1">
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
            <div class="set-card__title-wrap">
              <p class="set-card__name">
                <span>{{ set.setName }}</span>
                <span v-if="set.year" class="set-card__year">({{ set.year }})</span>
              </p>
              <span class="set-card__status" :data-status="set.status" @click.stop="cycleSetStatus(set)">{{ set.status }}</span>
            </div>
            <p class="set-card__secondary">
              <span class="set-card__manufacturer">{{ set.manufacturer }}</span>
              <template v-if="set.setNumber || set.legoReferenceNumber">
                <span class="set-card__secondary-sep" aria-hidden="true"> · </span>
                <span class="set-card__number">{{ formatSetNumber(set) }}</span>
              </template>
            </p>
            <div class="set-card__data-row">
              <span class="set-card__data-item">{{ formatPrice(set.purchasePrice) }}</span>
              <span class="set-card__data-sep" aria-hidden="true">·</span>
              <span class="set-card__data-item">{{ set.pieceCount?.toLocaleString() ?? '—' }}<span class="set-card__data-unit"> pcs</span></span>
              <span class="set-card__data-sep" aria-hidden="true">·</span>
              <span class="set-card__data-item">{{ formatCents(set.pricePerPiece) }}</span>
            </div>
          </div>
        </article>
        </div><!-- /desktop set-grid -->
      </template><!-- /card layout -->
      <div v-else-if="layoutMode === 'list'" class="set-list" role="list">
        <div v-if="!isMobileLayout" class="set-list-header" aria-hidden="true">
          <span class="set-list-header-thumb"></span>
          <span>Name</span>
          <span>Mfr.</span>
          <span>Set #</span>
          <span>Price</span>
          <span>Pieces</span>
          <span>ct/piece</span>
          <span class="set-list-header-status">Status</span>
        </div>
        <article
          v-for="set in displayedSets"
          :key="set.id"
          class="set-list-row"
          role="listitem"
          tabindex="0"
          @click="isMobileLayout ? openMobileDetail(set) : startEditing(set)"
          @keydown.enter="isMobileLayout ? openMobileDetail(set) : startEditing(set)"
          @keydown.space.prevent="isMobileLayout ? openMobileDetail(set) : startEditing(set)"
        >
          <div
            class="set-list-thumb"
            :data-status="set.status"
            @click.stop="onListThumbWrapperClick(set)"
          >
            <img
              v-if="getListThumbForSet(set.id)"
              :src="getListThumbForSet(set.id)!"
              :data-fallback="getCurrentImage(set.id)?.url"
              :alt="`Thumbnail for ${set.setName}`"
              loading="lazy"
              @click.stop="onListThumbClick(set)"
              @error="(e) => { const t = (e.target as HTMLImageElement); const fb = t.dataset.fallback; if (fb) t.src = fb; }"
            />
            <span
              v-else
              class="set-list-thumb-empty"
              aria-hidden="true"
              @click.stop="onListThumbClick(set)"
            >—</span>
          </div>
          <span class="set-list-col set-list-col--name set-list-col--desktop" :title="set.setName">{{ set.setName }}</span>
          <span class="set-list-col set-list-col--mfr set-list-col--desktop" :title="set.manufacturer">{{ set.manufacturer }}</span>
          <span class="set-list-col set-list-col--desktop">{{ formatListValue(set.setNumber || set.legoReferenceNumber) }}</span>
          <span class="set-list-col set-list-col--desktop">{{ formatPrice(set.purchasePrice) }}</span>
          <span class="set-list-col set-list-col--desktop">{{ formatListValue(set.pieceCount) }}</span>
          <span class="set-list-col set-list-col--desktop">{{ formatCents(set.pricePerPiece) }}</span>
          <span class="set-list-col set-list-col--status set-list-col--desktop">
            <span
              class="set-card__status"
              :data-status="set.status"
              role="button"
              tabindex="0"
              @click.stop="cycleSetStatus(set)"
              @keydown.enter.stop="cycleSetStatus(set)"
              @keydown.space.prevent.stop="cycleSetStatus(set)"
            >{{ set.status }}</span>
          </span>
          <div class="set-list-mobile-lines">
            <div class="set-list-line set-list-line--primary">
              <span class="set-list-name">{{ set.setName }}</span>
            </div>
            <div class="set-list-line set-list-line--secondary">
              <div class="set-list-line-left">
                <span class="set-list-manufacturer">{{ set.manufacturer }}</span>
                <template v-if="set.setNumber || set.legoReferenceNumber">
                  <span class="set-list-line-left-sep" aria-hidden="true">·</span>
                  <span class="set-card__number set-list-set-number">{{ formatSetNumber(set) }}</span>
                </template>
              </div>
              <span class="set-list-line-right">
                <span>{{ formatPrice(set.purchasePrice) }}</span>
                <span class="set-list-line-right-sep" aria-hidden="true">·</span>
                <span>{{ formatListValue(set.pieceCount) }}</span>
                <span class="set-list-line-right-sep" aria-hidden="true">·</span>
                <span>{{ formatCents(set.pricePerPiece) }}</span>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    </template>

  </section>

  <div
    v-if="isFormOverlayVisible"
    class="overlay form-overlay"
    role="dialog"
    aria-modal="true"
    @click.self="closeFormOverlay"
    @keydown.esc="closeFormOverlay"
    tabindex="-1"
    ref="formOverlayRef"
  >
    <form class="form-card" @submit.prevent="saveSet">

      <!-- Sticky top bar: close / title / save -->
      <div class="form-topbar">
        <button type="button" class="icon-button form-topbar-close" aria-label="Close form" @click="closeFormOverlay">&times;</button>
        <span class="form-topbar-title">{{ isEditing ? 'Edit set' : activeTab === 'wishlist' ? 'Add to wishlist' : 'Add set' }}</span>
        <div class="form-topbar-end">
          <button
            v-if="isEditing && editingSet?.listType === 'wishlist'"
            type="button"
            class="icon-button move-icon-button"
            aria-label="Move to Collection"
            title="Move to Collection"
            @click="openMoveOverlay"
          >&#10132;</button>
          <button type="submit" class="form-topbar-save" :disabled="submitting">
            {{ submitting ? '…' : isEditing ? 'Save' : 'Add' }}
          </button>
        </div>
      </div>

      <!-- Scrollable body -->
      <div class="form-body">

        <!-- Edit context: compact set identity -->
        <div v-if="isEditing && editingSet" class="form-set-context">
          <div class="form-set-context__thumb">
            <img
              v-if="getCurrentImage(editingId)"
              :src="getCurrentImage(editingId)?.thumbUrl || getCurrentImage(editingId)?.url"
              :data-fallback="getCurrentImage(editingId)?.url"
              :alt="editingSet.setName"
              @error="(e) => { const t = (e.target as HTMLImageElement); const fb = t.dataset.fallback; if (fb) t.src = fb; }"
            />
            <span v-else class="form-set-context__thumb-empty" aria-hidden="true">&#9638;</span>
          </div>
          <div class="form-set-context__info">
            <p class="form-set-context__name">{{ editingSet.setName }}</p>
            <p class="form-set-context__meta">{{ editingSet.manufacturer }}<template v-if="editingSet.setNumber || editingSet.legoReferenceNumber"> · {{ formatSetNumber(editingSet) }}</template></p>
          </div>
        </div>

        <!-- Segmented tabs (edit, non-wishlist only) -->
        <div v-if="isEditing && editingSet?.listType !== 'wishlist'" class="form-segment-tabs">
          <button type="button" :class="{ active: editTab === 'general' }" @click="editTab = 'general'">General</button>
          <button type="button" :class="{ active: editTab === 'details' }" @click="editTab = 'details'">Details</button>
        </div>

        <!-- GENERAL fields -->
        <div v-show="!isEditing || editTab === 'general'" class="form-fields">
          <label class="form-field form-field--full">
            <span class="form-label">Manufacturer</span>
            <input v-model="form.manufacturer" type="text" required list="manufacturer-options" placeholder="LEGO" />
            <datalist id="manufacturer-options">
              <option v-for="manufacturer in manufacturers" :key="manufacturer" :value="manufacturer" />
            </datalist>
          </label>
          <label class="form-field form-field--full">
            <span class="form-label">Set name</span>
            <input v-model="form.setName" type="text" required placeholder="Millennium Falcon" />
          </label>
          <div class="form-row-pair">
            <label class="form-field">
              <span class="form-label">Set number</span>
              <input v-model="form.setNumber" type="text" placeholder="75192" />
            </label>
            <label class="form-field">
              <span class="form-label">LEGO reference</span>
              <input v-model="form.legoReferenceNumber" type="text" placeholder="21348" />
            </label>
          </div>
          <div class="form-row-pair">
            <label class="form-field">
              <span class="form-label">Status</span>
              <select v-model="form.status">
                <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
            <label class="form-field">
              <span class="form-label">Brick size</span>
              <select v-model="form.brickSize">
                <option v-for="size in brickSizes" :key="size" :value="size">{{ size }}</option>
              </select>
            </label>
          </div>
          <!-- Collection: price + pieces -->
          <div v-if="(activeTab === 'collection' && !isEditing) || (isEditing && editingSet?.listType !== 'wishlist')" class="form-row-pair">
            <label class="form-field">
              <span class="form-label">Purchase price (EUR)</span>
              <input v-model="form.purchasePrice" type="text" inputmode="decimal" placeholder="199,99" @input="handleDecimalInput('purchasePrice', ($event.target as HTMLInputElement).value)" />
            </label>
            <label class="form-field">
              <span class="form-label">Piece count</span>
              <input v-model="form.pieceCount" type="number" min="0" placeholder="7541" />
            </label>
          </div>
          <!-- Wishlist: pieces + price/piece -->
          <div v-if="activeTab === 'wishlist' || (isEditing && editingSet?.listType === 'wishlist')" class="form-row-pair">
            <label class="form-field">
              <span class="form-label">Piece count</span>
              <input v-model="form.pieceCount" type="number" min="0" placeholder="7541" />
            </label>
            <label class="form-field">
              <span class="form-label">Price per piece (EUR)</span>
              <input v-model="form.pricePerPiece" type="text" inputmode="decimal" placeholder="0,05" @input="handleDecimalInput('pricePerPiece', ($event.target as HTMLInputElement).value)" />
            </label>
          </div>
        </div>

        <!-- DETAILS fields (edit, non-wishlist only) -->
        <div v-if="isEditing && editingSet?.listType !== 'wishlist'" v-show="editTab === 'details'" class="form-fields">
          <div class="form-row-pair">
            <div class="form-field form-field--toggle">
              <span class="form-label">Original box</span>
              <label class="toggle-switch">
                <input v-model="form.hasOriginalBox" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="form-field form-field--toggle">
              <span class="form-label">Printed photo</span>
              <label class="toggle-switch">
                <input v-model="form.hasPrintedPhoto" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="form-field form-field--toggle">
            <span class="form-label">Retired product</span>
            <label class="toggle-switch">
              <input v-model="form.retiredProduct" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="form-row-pair">
            <label class="form-field">
              <span class="form-label">Theme</span>
              <input v-model="form.theme" type="text" placeholder="Star Wars" list="theme-options" />
              <datalist id="theme-options">
                <option v-for="theme in activeThemes" :key="theme" :value="theme" />
              </datalist>
            </label>
            <label class="form-field">
              <span class="form-label">Year</span>
              <input v-model="form.year" type="number" min="1900" max="2100" placeholder="2024" />
            </label>
          </div>
          <label class="form-field form-field--full">
            <span class="form-label">Instructions URL</span>
            <input v-model="form.instructionsUrl" type="url" placeholder="https://..." />
          </label>
          <label class="form-field form-field--full">
            <span class="form-label">Notes</span>
            <textarea v-model="form.notes" rows="3" placeholder="Any additional notes…"></textarea>
          </label>
        </div>

        <!-- Delete (edit mode only) — visually secondary, at the bottom -->
        <div v-if="isEditing" class="form-delete-zone">
          <hr class="form-delete-divider" />
          <button
            type="button"
            class="form-delete-btn"
            :class="{ confirming: deleteSetConfirming }"
            :disabled="deletingSet"
            @click="deleteSet(editingId!)"
          >
            {{ deletingSet ? 'Deleting…' : deleteSetConfirming ? 'Are you sure?' : 'Delete set' }}
          </button>
        </div>

      </div><!-- /form-body -->
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
          <img
            :src="image.thumbUrl || image.url"
            :data-fallback="image.url"
            :alt="image.fileName"
            @error="(e) => { const t = (e.target as HTMLImageElement); const fb = t.dataset.fallback; if (fb) t.src = fb; }"
          />
          <div class="image-manager-item-info">
            <span v-if="!isMobileLayout" class="image-manager-item-date">{{ formatImageDate(image.createdAt) }}</span>
            <span v-if="!isMobileLayout" class="image-manager-item-source">{{ image.source }}</span>
            <span v-if="!isMobileLayout" class="image-manager-item-meta">Image size: {{ formatImageDimensions(image) }}</span>
            <span v-else class="image-manager-item-meta">{{ formatImageDimensions(image) }}</span>
            <span v-if="!isMobileLayout" class="image-manager-item-meta">File size: {{ formatFileSize(image.fileSize) }} / {{ formatFileSize(image.fileSizeThumb) }}</span>
            <span v-else class="image-manager-item-meta">{{ formatFileSize(image.fileSize) }} / {{ formatFileSize(image.fileSizeThumb) }}</span>
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
  <!-- Mobile filter drawer -->
  <div
    v-if="mobileFilterDrawerOpen"
    class="overlay mobile-filter-overlay"
    role="dialog"
    aria-modal="true"
    @click.self="mobileFilterDrawerOpen = false"
    @keydown.esc="mobileFilterDrawerOpen = false"
    tabindex="-1"
  >
    <div class="mobile-filter-drawer">
      <div class="mobile-filter-drawer-handle"></div>
      <div class="mobile-filter-drawer-header">
        <span class="mobile-filter-drawer-title">Filter &amp; Sort</span>
        <button type="button" class="icon-button" @click="mobileFilterDrawerOpen = false">&times;</button>
      </div>
      <div class="mobile-filter-section">
        <span class="controls-label">Filter</span>
        <div class="filter-chips" style="flex-wrap: wrap; display: flex; gap: 0.5rem;">
          <div class="chip filter-chip" :class="{ active: filters.manufacturer }">
            <span>{{ filters.manufacturer || 'Manufacturer' }}</span>
            <select v-model="filters.manufacturer">
              <option value="">All</option>
              <option v-for="m in activeManufacturers" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <button type="button" class="chip sort-chip" :class="{ active: filters.hasLegoNumber }" @click="toggleChipFilter('hasLegoNumber')"><span>Lego#</span></button>
          <div class="chip filter-chip" :class="{ active: filters.theme }">
            <span>{{ filters.theme || 'Theme' }}</span>
            <select v-model="filters.theme">
              <option value="">All</option>
              <option v-for="t in activeThemes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="chip filter-chip" :class="{ active: filters.status }">
            <span>{{ filters.status || 'Status' }}</span>
            <select v-model="filters.status">
              <option value="">All</option>
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="chip filter-chip" :class="{ active: filters.brickSize }">
            <span>{{ filters.brickSize || 'Size' }}</span>
            <select v-model="filters.brickSize">
              <option value="">All</option>
              <option v-for="sz in brickSizes" :key="sz" :value="sz">{{ sz }}</option>
            </select>
          </div>
          <button type="button" class="chip sort-chip" :class="{ active: filters.hasOriginalBox }" @click="toggleChipFilter('hasOriginalBox')"><span>Box</span></button>
          <button type="button" class="chip sort-chip" :class="{ active: filters.retiredProduct }" @click="toggleChipFilter('retiredProduct')"><span>Retired</span></button>
          <button type="button" class="chip sort-chip" :class="{ active: filters.hasPrintedPhoto }" @click="toggleChipFilter('hasPrintedPhoto')"><span>Photo</span></button>
          <button type="button" class="chip sort-chip" :class="{ active: filters.hasInstructions }" @click="toggleChipFilter('hasInstructions')"><span>Instructions</span></button>
        </div>
      </div>
      <div class="mobile-filter-section">
        <span class="controls-label">Sort</span>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            type="button"
            class="chip sort-chip"
            :class="{ active: sortField === option.key }"
            @click="setSortField(option.key)"
          >
            <span>{{ option.label }}</span>
            <span class="sort-direction">{{ sortField === option.key ? (sortDirection === 'asc' ? '▲' : '▼') : '' }}</span>
          </button>
        </div>
      </div>
      <div class="mobile-filter-drawer-footer">
        <button type="button" class="chip reset-chip" @click="resetFilters()">Reset</button>
        <button type="button" class="primary-button mobile-filter-close-btn" @click="mobileFilterDrawerOpen = false">Done</button>
      </div>
    </div>
  </div>

  <!-- Mobile set detail sheet -->
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
          <button type="button" class="icon-button" aria-label="Edit set" @click="openMobileDetailEdit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 20H20.5M18 10L21 7L17 3L14 6M18 10L8 20H4V16L14 6M18 10L14 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
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
          @error="(e) => { const t = (e.target as HTMLImageElement); const fb = t.dataset.fallback; if (fb) t.src = fb; }"
        />
        <button
          type="button"
          class="manage-images-gear mobile-detail-img-gear"
          aria-label="Manage images"
          @click.stop="openMobileDetailImages"
        ><span class="manage-images-gear__icon">&#9881;</span></button>
      </div>
      <div v-else class="mobile-detail-image-empty">
        <button
          type="button"
          class="manage-images-gear mobile-detail-img-gear mobile-detail-img-gear--empty"
          aria-label="Add images"
          @click.stop="openMobileDetailImages"
        ><span class="manage-images-gear__icon">&#9881;</span></button>
        No images
      </div>
      <div class="mobile-detail-body">
        <div class="mobile-detail-name-row">
          <h2 class="mobile-detail-name">{{ mobileDetailSet!.setName }}<span v-if="mobileDetailSet!.year" class="set-card__year">({{ mobileDetailSet!.year }})</span></h2>
          <span class="set-card__status" :data-status="mobileDetailSet!.status" @click="cycleSetStatus(mobileDetailSet!)">{{ mobileDetailSet!.status }}</span>
        </div>
        <p class="mobile-detail-manufacturer">{{ mobileDetailSet!.manufacturer }}</p>
        <p v-if="mobileDetailSet!.setNumber || mobileDetailSet!.legoReferenceNumber" class="set-card__number">{{ formatSetNumber(mobileDetailSet!) }}</p>
        <dl class="mobile-detail-meta">
          <div v-if="mobileDetailSet!.purchasePrice !== null">
            <dt>{{ mobileDetailSet!.listType === 'wishlist' ? 'Target' : 'Price' }}</dt>
            <dd>{{ formatPrice(mobileDetailSet!.purchasePrice) }}</dd>
          </div>
          <div v-if="mobileDetailSet!.pieceCount !== null">
            <dt>Pieces</dt>
            <dd>{{ mobileDetailSet!.pieceCount!.toLocaleString() }}</dd>
          </div>
          <div v-if="mobileDetailSet!.pricePerPiece !== null">
            <dt>ct/piece</dt>
            <dd>{{ formatCents(mobileDetailSet!.pricePerPiece) }}</dd>
          </div>
          <div v-if="mobileDetailSet!.brickSize">
            <dt>Size</dt>
            <dd>{{ mobileDetailSet!.brickSize }}</dd>
          </div>
          <div v-if="mobileDetailSet!.theme">
            <dt>Theme</dt>
            <dd>{{ mobileDetailSet!.theme }}</dd>
          </div>
          <div v-if="mobileDetailSet!.year">
            <dt>Year</dt>
            <dd>{{ mobileDetailSet!.year }}</dd>
          </div>
        </dl>
        <div class="set-card__chips" v-if="mobileDetailSet!.hasOriginalBox || mobileDetailSet!.retiredProduct || mobileDetailSet!.hasPrintedPhoto || mobileDetailSet!.instructionsUrl">
          <a v-if="mobileDetailSet!.instructionsUrl" class="detail-chip detail-chip--instructions" :href="mobileDetailSet!.instructionsUrl" target="_blank" rel="noopener" @click.stop>Instructions</a>
          <span v-if="mobileDetailSet!.retiredProduct" class="detail-chip detail-chip--retired">Retired</span>
          <span class="set-card__chips-spacer"></span>
          <span v-if="mobileDetailSet!.hasOriginalBox" class="detail-chip detail-chip--info">Box</span>
          <span v-if="mobileDetailSet!.hasPrintedPhoto" class="detail-chip detail-chip--info">Photo</span>
        </div>
        <p v-if="mobileDetailSet!.notes" class="mobile-detail-notes">{{ mobileDetailSet!.notes }}</p>
        <div class="mobile-detail-actions">
          <button type="button" class="primary-button mobile-detail-edit-btn" @click="openMobileDetailEdit">Edit Set</button>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="desktopDetailSet"
    class="overlay desktop-detail-overlay"
    role="dialog"
    aria-modal="true"
    @click.self="closeDesktopDetail"
    @keydown.esc="closeDesktopDetail"
    tabindex="-1"
  >
    <div class="desktop-detail-panel">
      <div class="desktop-detail-header">
        <div class="desktop-detail-top-actions">
          <button type="button" class="icon-button" aria-label="Edit set" @click="openDesktopDetailEdit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 20H20.5M18 10L21 7L17 3L14 6M18 10L8 20H4V16L14 6M18 10L14 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button type="button" class="icon-button" aria-label="Close" @click="closeDesktopDetail">&times;</button>
        </div>
      </div>
      <div class="desktop-detail-layout">
        <div v-if="getImagesForSet(desktopDetailSet!.id).length" class="desktop-detail-image-column">
          <img
            :src="getCurrentImage(desktopDetailSet!.id)!.thumbUrl || getCurrentImage(desktopDetailSet!.id)!.url"
            :data-fallback="getCurrentImage(desktopDetailSet!.id)!.url"
            :alt="desktopDetailSet!.setName"
            class="desktop-detail-main-image"
            @click="openImageViewer(desktopDetailSet!.id)"
            @error="(e) => { const t = (e.target as HTMLImageElement); const fb = t.dataset.fallback; if (fb) t.src = fb; }"
          />
          <button type="button" class="manage-images-gear desktop-detail-img-gear" aria-label="Manage images" @click.stop="openDesktopDetailImages"><span class="manage-images-gear__icon">&#9881;</span></button>
        </div>
        <div v-else class="desktop-detail-image-empty">
          <button type="button" class="manage-images-gear desktop-detail-img-gear desktop-detail-img-gear--empty" aria-label="Add images" @click.stop="openDesktopDetailImages"><span class="manage-images-gear__icon">&#9881;</span></button>
          No images
        </div>
        <div class="desktop-detail-body">
          <div class="mobile-detail-name-row">
            <h2 class="mobile-detail-name">{{ desktopDetailSet!.setName }}<span v-if="desktopDetailSet!.year" class="set-card__year">({{ desktopDetailSet!.year }})</span></h2>
            <span class="set-card__status" :data-status="desktopDetailSet!.status" @click="cycleSetStatus(desktopDetailSet!)">{{ desktopDetailSet!.status }}</span>
          </div>
          <p class="mobile-detail-manufacturer">{{ desktopDetailSet!.manufacturer }}</p>
          <p v-if="desktopDetailSet!.setNumber || desktopDetailSet!.legoReferenceNumber" class="set-card__number">{{ formatSetNumber(desktopDetailSet!) }}</p>
          <dl class="mobile-detail-meta">
            <div v-if="desktopDetailSet!.purchasePrice !== null">
              <dt>{{ desktopDetailSet!.listType === 'wishlist' ? 'Target' : 'Price' }}</dt>
              <dd>{{ formatPrice(desktopDetailSet!.purchasePrice) }}</dd>
            </div>
            <div v-if="desktopDetailSet!.pieceCount !== null">
              <dt>Pieces</dt>
              <dd>{{ desktopDetailSet!.pieceCount!.toLocaleString() }}</dd>
            </div>
            <div v-if="desktopDetailSet!.pricePerPiece !== null">
              <dt>ct/piece</dt>
              <dd>{{ formatCents(desktopDetailSet!.pricePerPiece) }}</dd>
            </div>
            <div v-if="desktopDetailSet!.brickSize">
              <dt>Size</dt>
              <dd>{{ desktopDetailSet!.brickSize }}</dd>
            </div>
            <div v-if="desktopDetailSet!.theme">
              <dt>Theme</dt>
              <dd>{{ desktopDetailSet!.theme }}</dd>
            </div>
            <div v-if="desktopDetailSet!.year">
              <dt>Year</dt>
              <dd>{{ desktopDetailSet!.year }}</dd>
            </div>
          </dl>
          <div class="set-card__chips" v-if="desktopDetailSet!.hasOriginalBox || desktopDetailSet!.retiredProduct || desktopDetailSet!.hasPrintedPhoto || desktopDetailSet!.instructionsUrl">
            <a v-if="desktopDetailSet!.instructionsUrl" class="detail-chip detail-chip--instructions" :href="desktopDetailSet!.instructionsUrl" target="_blank" rel="noopener" @click.stop>Instructions</a>
            <span v-if="desktopDetailSet!.retiredProduct" class="detail-chip detail-chip--retired">Retired</span>
            <span class="set-card__chips-spacer"></span>
            <span v-if="desktopDetailSet!.hasOriginalBox" class="detail-chip detail-chip--info">Box</span>
            <span v-if="desktopDetailSet!.hasPrintedPhoto" class="detail-chip detail-chip--info">Photo</span>
          </div>
          <p v-if="desktopDetailSet!.notes" class="mobile-detail-notes">{{ desktopDetailSet!.notes }}</p>
          <div class="mobile-detail-actions">
            <button type="button" class="primary-button mobile-detail-edit-btn" @click="openDesktopDetailEdit">Edit Set</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Mobile sticky bottom navigation -->
  <nav class="mobile-bottom-nav" aria-label="Navigation">
    <button
      type="button"
      class="mobile-nav-item"
      :class="{ active: activeTab === 'collection' }"
      @click="activeTab = 'collection'"
    >
      <span class="mobile-nav-icon" aria-hidden="true">&#9638;</span>
      <span class="mobile-nav-label">Collection</span>
    </button>
    <button
      type="button"
      class="mobile-nav-item"
      :class="{ active: activeTab === 'wishlist' }"
      @click="activeTab = 'wishlist'"
    >
      <span class="mobile-nav-icon" aria-hidden="true">&#9825;</span>
      <span class="mobile-nav-label">Wishlist</span>
    </button>
    <button
      type="button"
      class="mobile-nav-add"
      @click="handleBottomNavAdd"
      :aria-label="activeTab === 'wishlist' ? 'Add to wishlist' : activeTab === 'kids' ? 'Add kids set' : 'Add set'"
    >+</button>
    <button
      type="button"
      class="mobile-nav-item"
      :class="{ active: activeTab === 'kids' }"
      @click="activeTab = 'kids'"
    >
      <span class="mobile-nav-icon" aria-hidden="true">&#9671;</span>
      <span class="mobile-nav-label">Kids</span>
    </button>
    <button
      type="button"
      class="mobile-nav-item mobile-nav-darkmode"
      @click="toggleDarkMode"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <span class="mobile-nav-icon">{{ isDark ? '☀️' : '🌙' }}</span>
      <span class="mobile-nav-label">{{ isDark ? 'Hell' : 'Dunkel' }}</span>
    </button>
  </nav>

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
import { BRICK_SIZES, MANUFACTURERS, MOBILE_BREAKPOINT } from './constants';
import KidsApp from './kids/KidsApp.vue';
import {
  addImageFromUrl,
  createSet,
  deleteAllImages as apiDeleteAllImages,
  deleteImage as apiDeleteImage,
  deleteSet as apiDeleteSet,
  fetchSetImages as apiFetchSetImages,
  fetchSets,
  moveSet,
  reorderImages,
  scrapeImages as apiScrapeImages,
  updateSet,
  uploadImages as apiUploadImages
} from './setsApi';

const kidsAppRef = ref<{ openAddForm: () => void } | null>(null);

const handleBottomNavAdd = () => {
  if (activeTab.value === 'kids') {
    kidsAppRef.value?.openAddForm();
  } else {
    openAddForm();
  }
};

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

type ListType = 'collection' | 'wishlist' | 'kids';

const statuses: SetStatus[] = ['New', 'Building', 'Built', 'Disassembled', 'Sold'];
const brickSizes = [...BRICK_SIZES];
const manufacturers = [...MANUFACTURERS];

const isMobileLayout = ref(
  typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
);
const updateIsMobileLayout = () => {
  isMobileLayout.value = window.innerWidth <= MOBILE_BREAKPOINT;
};

type LayoutMode = 'card' | 'list';
type SortField = 'setName' | 'purchasePrice' | 'pieceCount' | 'pricePerPiece';

const layoutMode = ref<LayoutMode>('card');
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
  thumbUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  fileSize: number | null;
  fileSizeThumb: number | null;
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
  const kb = Math.round(value / 1024);
  return `${kb} KB`;
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
  document.removeEventListener('mousedown', handleDesktopOutsideClick);
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
    await addImageFromUrl(setId, imageUrlInput.value);
    imageUrlInput.value = '';
    await fetchSetImages(setId);
  } catch (error) {
    imageUrlError.value = error instanceof Error ? error.message : 'Upload failed';
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
    const data = await apiScrapeImages(setId, {
      rawHtml: scrapeForm.rawHtml,
      baseUrl: scrapeForm.baseUrl || undefined
    });
    scrapeResult.value = { found: data.found, downloaded: data.downloaded, skipped: data.skipped };
    if (data.downloaded > 0) {
      await fetchSetImages(setId);
    }
  } catch (error) {
    scrapeError.value = error instanceof Error ? error.message : 'Scraping failed';
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
    setImages[setId] = await apiFetchSetImages(setId);
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
    await apiUploadImages(setId, files);
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
    await apiDeleteImage(setId, imageId);
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
    await apiDeleteAllImages(setId);
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
    await apiDeleteSet(setId);
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
    await moveSet(editingId.value, body);
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
    const updated = await updateSet(set.id, { status: nextStatus });
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
    setImages[setId] = await reorderImages(setId, reordered.map((img) => img.id));
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

const formatListValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
};

const getListThumbForSet = (setId: string) => {
  const image = getCurrentImage(setId);
  if (!image) return null;
  return image.thumbUrl || image.url;
};

const onListThumbClick = (set: BrickSet) => {
  if (getImagesForSet(set.id).length) {
    openImageViewer(set.id);
  } else {
    openImageManager(set.id);
  }
};

const onListThumbWrapperClick = (set: BrickSet) => {
  if (isMobileLayout.value) {
    cycleSetStatus(set);
  }
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
  return `${formatWithComma(cents, 2)} ct`;
};

const filters = reactive({
  manufacturer: '',
  theme: '',
  status: '',
  brickSize: '',
  hasOriginalBox: false,
  retiredProduct: false,
  hasPrintedPhoto: false,
  hasInstructions: false,
  hasLegoNumber: false
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
  filters.hasLegoNumber = false;
  sortField.value = 'setName';
  sortDirection.value = 'asc';
};

const toggleChipFilter = (
  key: 'hasOriginalBox' | 'retiredProduct' | 'hasPrintedPhoto' | 'hasInstructions' | 'hasLegoNumber'
) => {
  filters[key] = !filters[key];
};

const filteredSets = computed(() => {
  let result = activeSets.value.slice();

  if (filters.manufacturer) {
    result = result.filter(
      (set) => set.manufacturer?.toLowerCase() === filters.manufacturer.toLowerCase()
    );
  }
  if (filters.hasLegoNumber) {
    result = result.filter((set) => Boolean(set.legoReferenceNumber?.trim()));
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

const searchQuery = ref('');
const mobileFilterDrawerOpen = ref(false);
const mobileDetailSetId = ref<string | null>(null);
const desktopDetailSetId = ref<string | null>(null);
const desktopFilterPanelOpen = ref(false);
const desktopSortPanelOpen = ref(false);
const filterPopoverRef = ref<HTMLElement | null>(null);
const sortPopoverRef = ref<HTMLElement | null>(null);

const activeFilterCount = computed(() => {
  return [
    filters.manufacturer,
    filters.theme,
    filters.status,
    filters.brickSize,
    filters.hasOriginalBox,
    filters.retiredProduct,
    filters.hasPrintedPhoto,
    filters.hasInstructions,
    filters.hasLegoNumber
  ].filter(Boolean).length;
});

const displayedSets = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return filteredSets.value;
  return filteredSets.value.filter((s) =>
    s.setName.toLowerCase().includes(q) ||
    (s.setNumber?.toLowerCase().includes(q) ?? false) ||
    (s.legoReferenceNumber?.toLowerCase().includes(q) ?? false) ||
    s.manufacturer.toLowerCase().includes(q)
  );
});

const mobileDetailSet = computed(() =>
  mobileDetailSetId.value ? sets.value.find((s) => s.id === mobileDetailSetId.value) ?? null : null
);
const desktopDetailSet = computed(() =>
  desktopDetailSetId.value ? sets.value.find((s) => s.id === desktopDetailSetId.value) ?? null : null
);

const currentSortLabel = computed(() =>
  sortOptions.find((o) => o.key === sortField.value)?.label ?? String(sortField.value)
);

const handleDesktopOutsideClick = (event: MouseEvent) => {
  if (filterPopoverRef.value && !filterPopoverRef.value.contains(event.target as Node)) {
    desktopFilterPanelOpen.value = false;
  }
  if (sortPopoverRef.value && !sortPopoverRef.value.contains(event.target as Node)) {
    desktopSortPanelOpen.value = false;
  }
};

watch([desktopFilterPanelOpen, desktopSortPanelOpen], ([filterOpen, sortOpen]) => {
  if (filterOpen || sortOpen) {
    document.addEventListener('mousedown', handleDesktopOutsideClick);
  } else {
    document.removeEventListener('mousedown', handleDesktopOutsideClick);
  }
});

const openMobileDetail = (set: BrickSet) => {
  mobileDetailSetId.value = set.id;
};
const closeMobileDetail = () => {
  mobileDetailSetId.value = null;
};
const openDesktopDetail = (set: BrickSet) => {
  desktopDetailSetId.value = set.id;
};
const closeDesktopDetail = () => {
  desktopDetailSetId.value = null;
};
const openMobileDetailEdit = () => {
  const set = mobileDetailSet.value;
  if (!set) return;
  closeMobileDetail();
  startEditing(set);
};
const openDesktopDetailEdit = () => {
  const set = desktopDetailSet.value;
  if (!set) return;
  closeDesktopDetail();
  startEditing(set);
};
const openMobileDetailImages = () => {
  const set = mobileDetailSet.value;
  if (!set) return;
  closeMobileDetail();
  openImageManager(set.id);
};
const openDesktopDetailImages = () => {
  const set = desktopDetailSet.value;
  if (!set) return;
  closeDesktopDetail();
  openImageManager(set.id);
};

const collectionStats = computed(() => {
  const all = displayedSets.value;
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
    sets.value = await fetchSets();
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
    if (targetId) {
      await updateSet(targetId, payload);
    } else {
      await createSet(payload);
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

<style src="./app-ui.css" scoped></style>
