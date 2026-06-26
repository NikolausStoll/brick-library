import { mount, flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import KidsApp from './KidsApp.vue';

const mockSets = [
  {
    id: '1',
    manufacturer: 'LEGO',
    setName: 'Police Station',
    setNumber: '60316',
    pieceCount: 540,
    brickSize: 'Standard',
    instructionsUrl: 'https://example.com/pdf',
    createdAt: '',
    updatedAt: ''
  },
  {
    id: '2',
    manufacturer: 'King',
    setName: 'Fire Truck',
    setNumber: '60321',
    pieceCount: 99,
    brickSize: 'Mini',
    instructionsUrl: null,
    createdAt: '',
    updatedAt: ''
  }
];

const createFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url === '/api/kids/sets') {
      return new Response(JSON.stringify(mockSets), { status: 200 });
    }
    if (url.match(/\/api\/kids\/sets\/\d+\/images$/)) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  });

describe('KidsApp.vue', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', createFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders kids sets and compact stats', async () => {
    const wrapper = mount(KidsApp);
    await flushPromises();
    expect(wrapper.text()).toContain('Police Station');
    expect(wrapper.text()).toContain('Total Sets');
    expect(wrapper.text()).toContain('Total Pieces');
    expect(wrapper.text()).toContain('2');
  });

  it('sorts by piece count', async () => {
    const wrapper = mount(KidsApp);
    await flushPromises();
    const piecesSort = wrapper.findAll('button.sort-chip').find((b) => b.text().includes('Pieces'));
    await piecesSort!.trigger('click');
    await wrapper.vm.$nextTick();
    const names = wrapper.findAll('.set-card__name').map((n) => n.text());
    expect(names[0]).toContain('Fire Truck');
  });
});
