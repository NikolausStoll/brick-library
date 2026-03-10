<template>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">Brick-by-brick inventory</p>
      <h1>Brick Library</h1>
      <p>Track LEGO and third-party sets across your physical collection.</p>
    </section>

    <section class="content-grid">
      <form class="card form-card" @submit.prevent="saveSet">
        <h2>{{ isEditing ? 'Edit set' : 'Add a set' }}</h2>
        <label>
          Manufacturer
          <input v-model="form.manufacturer" type="text" required placeholder="LEGO" />
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
          Status
          <select v-model="form.status">
            <option v-for="status in statuses" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </label>
        <label>
          Purchase price (EUR)
          <input v-model="form.purchasePrice" type="number" step="0.01" placeholder="199.99" />
        </label>
        <label>
          Piece count
          <input v-model="form.pieceCount" type="number" min="0" placeholder="7541" />
        </label>
        <button type="submit" :disabled="submitting">{{ isEditing ? 'Update set' : 'Save set' }}</button>
        <button
          v-if="isEditing"
          type="button"
          class="text-button"
          @click="resetForm"
        >
          Cancel
        </button>
      </form>

      <section class="card list-card">
        <div class="list-header">
          <h2>Collection</h2>
          <span class="count">{{ sets.length }} sets</span>
        </div>
        <div v-if="sets.length === 0" class="empty">
          No sets yet. Add one to start tracking your library.
        </div>
        <div v-else class="set-grid">
          <article v-for="set in sets" :key="set.id" class="set-card">
            <div class="set-card__header">
              <p class="set-card__manufacturer">{{ set.manufacturer }}</p>
              <p class="set-card__status">{{ set.status }}</p>
            </div>
            <p class="set-card__name">{{ set.setName }}</p>
            <p class="set-card__number" v-if="set.setNumber">#{{ set.setNumber }}</p>
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
                <dt>Price per piece (ct)</dt>
                <dd>{{ formatCents(set.pricePerPiece) }}</dd>
              </div>
            </dl>
            <button type="button" class="link-button" @click="startEditing(set)">Edit</button>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type SetStatus = 'New' | 'Building' | 'Built' | 'Disassembled';

type BrickSet = {
  id: string;
  manufacturer: string;
  setName: string;
  setNumber: string | null;
  status: SetStatus;
  purchasePrice: number | null;
  pieceCount: number | null;
  pricePerPiece: number | null;
};

const statuses: SetStatus[] = ['New', 'Building', 'Built', 'Disassembled'];

const sets = ref<BrickSet[]>([]);
const submitting = ref(false);

type FormPayload = {
  manufacturer: string;
  setName: string;
  setNumber: string;
  status: SetStatus;
  purchasePrice: string;
  pieceCount: string;
};

const createEmptyForm = (): FormPayload => ({
  manufacturer: '',
  setName: '',
  setNumber: '',
  status: statuses[0],
  purchasePrice: '',
  pieceCount: ''
});

const form = ref<FormPayload>(createEmptyForm());
const editingId = ref<string | null>(null);
const isEditing = computed(() => Boolean(editingId.value));

const resetForm = () => {
  editingId.value = null;
  form.value = createEmptyForm();
};

const formatPrice = (value: number | null) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return `€${value.toFixed(2)}`;
};

const formatCents = (value: number | null) => {
  if (value === null || value === undefined) {
    return '—';
  }
  const cents = value * 100;
  return `${cents.toFixed(3)} ct`;
};

const loadSets = async () => {
  try {
    const response = await fetch('/api/sets');
    if (!response.ok) {
      throw new Error('Unable to load sets');
    }
    sets.value = await response.json();
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
    status: set.status,
    purchasePrice: set.purchasePrice != null ? String(set.purchasePrice) : '',
    pieceCount: set.pieceCount != null ? String(set.pieceCount) : ''
  };
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
      status: form.value.status,
      purchasePrice:
        form.value.purchasePrice === '' ? null : Number(form.value.purchasePrice),
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
    resetForm();
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
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
  margin-top: 1rem;
  border: none;
  border-radius: 0.9rem;
  background: #0f172a;
  color: white;
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
  margin-top: 0.35rem;
  border-radius: 0.65rem;
  border: 1px solid rgba(15, 23, 42, 0.2);
  font-size: 0.95rem;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.count {
  font-weight: 600;
}

.set-grid {
  display: grid;
  gap: 1rem;
}

.set-card {
  padding: 1rem;
  border-radius: 1rem;
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.08);
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
  font-size: 0.9rem;
  color: #0f172a;
}

.set-card__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 0.5rem;
  margin: 0;
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
}

.empty {
  padding: 1rem 0;
  color: #475569;
}
</style>
