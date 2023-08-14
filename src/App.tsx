import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand'
import { useForm } from "react-hook-form";
import { immer } from 'zustand/middleware/immer'
import * as ToggleGroup from '@radix-ui/react-toggle-group';

type Cell = number | 'blank'
type Alphabet = 'hiragana' | 'latin' | 'number' | 'blank'

interface GameStore {
  alphabet: string;
  setAlphabet: (alphabet: Alphabet) => void;
  cells: Cell[];
  height: number;
  width: number;
  numColors: number;
  initCells: (height: number, width: number, numColors: number) => void;
  clearCell: (pos: number) => void;
}

function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

const useGameStore = create<GameStore>()(immer((set) => ({
  alphabet: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑを',
  setAlphabet: (alphabet) => set((state) => {
    switch (alphabet) {
      case 'hiragana':
        state.alphabet = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑを'
        return
      case 'latin':
        state.alphabet = 'abcdefghijklmnopqrstuvwxyz'
        return
      case 'number':
        state.alphabet = '0123456789'
        return
      case 'blank':
        state.alphabet = ' '
        return
    }
  }),
  cells: [],
  height: 15,
  width: 23,
  numColors: 10,
  initCells: (height, width, numColors) => set((state) => {
    state.width = width
    state.height = height
    state.numColors = numColors
    state.cells = new Array(height * width);
    const amt = Math.floor(height * width / numColors * 0.6);
    for (let i = 0; i < height * width; i++) {
      if (i >= amt * numColors) state.cells[i] = 'blank'
      else state.cells[i] = Math.floor(i / amt)
    }
    shuffleArray(state.cells)
  }),
  clearCell: (pos) => set((state) => {
    if (state.cells.length === 0) return
    state.cells[pos] = 'blank';
  })
})))

const Game = ({ width, height, numColors }: { width: number, height: number, numColors: number }) => {
  console.log('RENDERING GAME')
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    useGameStore.getState().initCells(height, width, numColors)
    setLoaded(true)
  }, [height, width, numColors])

  const colorCSS = (color: Cell) =>
    color === 'blank' ? '#efefef' :
      'hsl(' + Math.floor(color / numColors * 360) + ', 100%, ' + ((color % 2 === 0) ? '75' : '90') + '%)'

  const cells = useGameStore((state) => state.cells)
  const refs = useRef(new Array(height * width))
  const hovered = useRef([] as number[])

  const collect = (idx: number): number[] => {
    if (cells[idx] !== 'blank') return []
    const i = Math.floor(idx / width)
    const j = idx % width
    const collected = []
    let k

    k = i - 1
    while (k >= 0 && cells[k * width + j] === 'blank') {
      k--;
    }
    if (k >= 0)
      collected.push(k * width + j)

    k = i + 1
    while (k < height && cells[k * width + j] === 'blank')
      k++
    if (k < height)
      collected.push(k * width + j)

    k = j - 1
    while (k >= 0 && cells[i * width + k] === 'blank')
      k--
    if (k >= 0)
      collected.push(i * width + k)

    k = j + 1
    while (k < width && cells[i * width + k] === 'blank')
      k++
    if (k < width)
      collected.push(i * width + k)
    return collected
  }

  const isValid = () => {
    return cells.filter((v, i) => v === 'blank' && commons(collect(i)).length > 0).length > 0
  }

  const commons = (idxs: number[]) => {
    const colors = idxs.map(idx => cells[idx]) as number[]
    const clear = []

    for (const idx of idxs) {
      if (colors.filter(color => color === cells[idx]).length > 1)
        clear.push(idx)
    }
    return clear
  }

  const handler = (idx: number) => {
    if (cells[idx] !== 'blank')
      return

    const collected = collect(idx)
    const clear = commons(collected)

    for (const idx of clear) {
      useGameStore.getState().clearCell(idx)
    }

  }

  if (loaded && !isValid()) {
    alert("GAME JOEVER!!!")
  }

  const alphabet = useGameStore((state) => state.alphabet)

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(' + width + ', 2rem)' }}>
      {cells.map((v, i) => (
        <div key={i} className="relative w-8 h-8">
          <button
            onMouseEnter={() => {
              hovered.current = collect(i)
              for (const ref of hovered.current.map(idx => refs.current![idx])) {
                ref.style.height = '2.2rem'
                ref.style.width = '2.2rem'
                ref.style.zIndex = '999'
              }
            }}
            onMouseLeave={() => {
              for (const ref of hovered.current.map(idx => refs.current![idx])) {
                ref.style.height = '2rem'
                ref.style.width = '2rem'
              }
            }}
            className="w-8 h-8 transition-all absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded"
            onClick={() => handler(i)}
            ref={e => refs.current[i] = e}
            style={{ backgroundColor: colorCSS(v) }} disabled={v !== 'blank'}>
            {v === 'blank' ? ' ' : alphabet.charAt(v % alphabet.length)}
          </button>
        </div>
      ))}
    </div>
  )
}


type FormData = {
  width: number;
  height: number;
  numColors: number;
};

const App = () => {
  const { register, handleSubmit } = useForm<FormData>();
  const width = useGameStore((state) => state.width)
  const height = useGameStore((state) => state.height)
  const numColors = useGameStore((state) => state.numColors)
  const setAlphabet = useGameStore((state) => state.setAlphabet)
  const onSubmit = handleSubmit(data => {
    useGameStore.getState().initCells(data.height, data.width, data.numColors)
  })
  return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      <h1>color tiles by michael</h1>
      <div className="p-2 text-sm">
        <form onSubmit={onSubmit}>
          <label htmlFor="width" className="mx-2 py-1">width:</label>
          <input defaultValue="23" {...register('width')} className="bg-stone-50 px-2 py-1" />
          <label htmlFor="height" className="mx-2 py-1">height:</label>
          <input defaultValue="15" {...register('height')} className="bg-stone-50 px-2 py-1" />
          <label htmlFor="numColors" className="mx-2 py-1"># colors:</label>
          <input defaultValue="10" {...register('numColors')} className="bg-stone-50 px-2 py-1" />
          <button type="submit" className="bg-lime-200 ml-2 px-2 py-1">new game</button>
          <ToggleGroup.Root
            type="single"
            defaultValue="hiragana"
            onValueChange={(value: Alphabet) => {
              console.log("setting alphabet to", value)
              setAlphabet(value)
            }}
          >
            <ToggleGroup.Item value="hiragana" className="px-2 py-1 bg-indigo-300">hiragana</ToggleGroup.Item>
            <ToggleGroup.Item value="latin" className="px-2 py-1 bg-emerald-300">abc</ToggleGroup.Item>
            <ToggleGroup.Item value="number" className="px-2 py-1 bg-indigo-300">123</ToggleGroup.Item>
            <ToggleGroup.Item value="blank" className="px-2 py-1 bg-rose-300">[   ]</ToggleGroup.Item>
          </ToggleGroup.Root>
        </form>
      </div>
      <Game width={width} height={height} numColors={numColors} />
    </div>
  )
}

export default App
