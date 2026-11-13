import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.vue';

vi.mock('../../brick-library/config.yaml?raw', () => ({
  default: 'version: "1.3.2"\n'
}));

type BrickSet = {
  id: string;
  manufacturer: string;
  setName: string;
  setNumber: string | null;
  legoReferenceNumber: string | null;
  brickSize: string;
  status: 'New' | 'Building' | 'Built' | 'Disassembled' | 'Sold';
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

const mockSets: BrickSet[] = [
  {
    id: '1',
    manufacturer: 'LEGO',
    setName: 'Alpha Set',
    setNumber: '1001',
    legoReferenceNumber: null,
    brickSize: 'Standard',
    status: 'New',
    purchasePrice: 10,
    pieceCount: 100,
    pricePerPiece: 0.1,
    hasOriginalBox: false,
    hasPrintedPhoto: false,
    year: null,
    notes: null,
    instructionsUrl: null,
    retiredProduct: false,
    theme: 'Star Wars',
    listType: 'collection'
  },
  {
    id: '2',
    manufacturer: 'King',
    setName: 'Beta Set',
    setNumber: null,
    legoReferenceNumber: '12345',
    brickSize: 'Mini',
    status: 'Built',
    purchasePrice: 20,
    pieceCount: 200,
    pricePerPiece: 0.1,
    hasOriginalBox: true,
    hasPrintedPhoto: true,
    year: 2020,
    notes: 'Note',
    instructionsUrl: 'https://example.com/pdf',
    retiredProduct: true,
    theme: 'City',
    listType: 'collection'
  },
  {
    id: '3',
    manufacturer: 'LEGO',
    setName: 'Wishlist Item',
    setNumber: '2002',
    legoReferenceNumber: null,
    brickSize: 'Standard',
    status: 'New',
    purchasePrice: 15,
    pieceCount: 50,
    pricePerPiece: 0.3,
    hasOriginalBox: false,
    hasPrintedPhoto: false,
    year: null,
    notes: null,
    instructionsUrl: null,
    retiredProduct: null,
    theme: 'Technic',
    listType: 'wishlist'
  }
];

let setsStore = structuredClone(mockSets);

const createFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const jsonResponse = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });

    if (url === '/api/sets' && (!init || init.method === undefined || init.method === 'GET')) {
      return jsonResponse(setsStore);
    }

    const imagesMatch = url.match(/\/api\/sets\/(\d+)\/images$/);
    if (imagesMatch && (!init || init.method === undefined || init.method === 'GET')) {
      return jsonResponse([]);
    }

    const updateMatch = url.match(/\/api\/sets\/(\d+)$/);
    if (updateMatch && init?.method === 'PUT') {
      const id = updateMatch[1];
      const body = JSON.parse(String(init.body));
      const index = setsStore.findIndex((set) => set.id === id);
      if (index === -1) {
        return jsonResponse({ error: 'Set not found' }, 404);
      }
      setsStore[index] = { ...setsStore[index], ...body };
      return jsonResponse(setsStore[index]);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  });

const mountApp = async (): Promise<VueWrapper> => {
  const wrapper = mount(App);
  await flushPromises();
  return wrapper;
};

describe('App.vue', () => {
  beforeEach(() => {
    setsStore = structuredClone(mockSets);
    vi.stubGlobal('fetch', createFetchMock());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows collection sets by default and switches to wishlist tab', async () => {
    const wrapper = await mountApp();

    expect(wrapper.text()).toContain('Alpha Set');
    expect(wrapper.text()).toContain('Beta Set');
    expect(wrapper.text()).not.toContain('Wishlist Item');

    await wrapper.get('.page-tabs button:nth-child(2)').trigger('click');
    expect(wrapper.text()).toContain('Wishlist Item');
    expect(wrapper.text()).not.toContain('Alpha Set');
  });

  it('renders collection stats for filtered sets', async () => {
    const wrapper = await mountApp();
    // Compact stats row: "2 Sets · €30,00 total · 300 pieces · ..."
    expect(wrapper.text()).toContain('2 Sets');
    expect(wrapper.text()).toContain('€30,00 total');
    expect(wrapper.text()).toContain('300 pieces');
  });

  it('filters by manufacturer case-insensitively', async () => {
    const wrapper = await mountApp();
    // Open desktop filter panel
    const filtersBtn = wrapper.findAll('.toolbar-btn').find((b) => b.text().includes('Filter'));
    await filtersBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    // First select inside filter panel is manufacturer
    const manufacturerSelect = wrapper.find('.desktop-filter-panel select');
    await manufacturerSelect.setValue('King');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Beta Set');
    expect(wrapper.text()).not.toContain('Alpha Set');
  });

  it('filters by LEGO number chip', async () => {
    const wrapper = await mountApp();
    // Open desktop filter panel
    const filtersBtn = wrapper.findAll('.toolbar-btn').find((b) => b.text().includes('Filter'));
    await filtersBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const legoChip = wrapper
      .findAll('.filter-toggle-chip')
      .find((b) => b.text().includes('LEGO'));
    await legoChip!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Beta Set');
    expect(wrapper.text()).not.toContain('Alpha Set');
  });

  it('filters by retired chip in the desktop filter panel', async () => {
    const wrapper = await mountApp();

    const filtersBtn = wrapper.findAll('.toolbar-btn').find((b) => b.text().includes('Filter'));
    await filtersBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const retiredChip = wrapper
      .findAll('.filter-toggle-chip')
      .find((b) => b.text().includes('Retired'));
    await retiredChip!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Beta Set');
    expect(wrapper.text()).not.toContain('Alpha Set');
  });

  it('keeps the desktop gallery overview focused on primary comparison data', async () => {
    const wrapper = await mountApp();

    expect(wrapper.findAll('.detail-chip')).toHaveLength(0);
    expect(wrapper.findAll('.set-card__name')[0]?.text()).toContain('Alpha Set');
    expect(wrapper.findAll('.set-card__data-row')[0]?.text()).toContain('€10,00');
  });

  it('sorts by purchase price descending when toggled twice', async () => {
    const wrapper = await mountApp();
    const sortBtn = wrapper.find('.toolbar-sort-btn');

    // First open: set sort to Price (asc), panel closes
    await sortBtn.trigger('click');
    await wrapper.vm.$nextTick();
    let priceOption = wrapper
      .findAll('.desktop-sort-option')
      .find((b) => b.text().includes('Price') && !b.text().includes('piece'));
    await priceOption!.trigger('click');
    await wrapper.vm.$nextTick();

    // Second open: toggle same field to desc, panel closes
    await sortBtn.trigger('click');
    await wrapper.vm.$nextTick();
    priceOption = wrapper
      .findAll('.desktop-sort-option')
      .find((b) => b.text().includes('Price') && !b.text().includes('piece'));
    await priceOption!.trigger('click');
    await wrapper.vm.$nextTick();

    const names = wrapper.findAll('.set-card__name').map((node) => node.text());
    expect(names[0]).toContain('Beta Set');
    expect(names[1]).toContain('Alpha Set');
  });

  it('resets filters and sort', async () => {
    const wrapper = await mountApp();
    // Open filter panel and apply manufacturer filter
    const filtersBtn = wrapper.findAll('.toolbar-btn').find((b) => b.text().includes('Filter'));
    await filtersBtn!.trigger('click');
    await wrapper.vm.$nextTick();
    const manufacturerSelect = wrapper.find('.desktop-filter-panel select');
    await manufacturerSelect.setValue('King');
    await wrapper.vm.$nextTick();

    // Click Reset inside the filter panel
    await wrapper.get('.desktop-filter-reset').trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Alpha Set');
    expect(wrapper.text()).toContain('Beta Set');
  });

  it('cycles set status on badge click', async () => {
    const wrapper = await mountApp();
    const statusBadge = wrapper.find('.set-card__status');
    await statusBadge.trigger('click');
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith(
      '/api/sets/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ status: 'Building' })
      })
    );
  });

  it('shows app version from config', async () => {
    const wrapper = await mountApp();
    expect(wrapper.find('.app-version').text()).toBe('v1.3.2');
  });

  it('persists dark mode preference in localStorage', async () => {
    const wrapper = await mountApp();
    await wrapper.get('.dark-mode-toggle').trigger('click');
    expect(localStorage.getItem('brick-library-dark')).toBe('1');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('shows empty state when filters match nothing', async () => {
    const wrapper = await mountApp();
    // Open filter panel and set Status to Sold (no sets have status Sold)
    const filtersBtn = wrapper.findAll('.toolbar-btn').find((b) => b.text().includes('Filter'));
    await filtersBtn!.trigger('click');
    await wrapper.vm.$nextTick();
    // selects in filter panel: [manufacturer, theme, status, brickSize]
    const selects = wrapper.findAll('.desktop-filter-panel select');
    await selects[2].setValue('Sold');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('No sets match the active filters.');
  });
});
