import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { useForm } from "react-hook-form"
import { immer } from 'zustand/middleware/immer'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import * as Tooltip from '@radix-ui/react-tooltip';
import { ArrowUUpLeft, ArrowUUpRight, ArrowsCounterClockwise } from '@phosphor-icons/react'

type Cell = number | 'blank'
type Alphabet = 'hiragana' | 'latin' | 'number' | 'blank'

interface GameStore {
  alphabet: string;
  setAlphabet: (alphabet: Alphabet) => void;
  cells: Cell[];
  cleared: boolean[];
  history: number[][];
  historyPtr: number;
  redo: () => void;
  undo: () => void;
  undoUntilAllEven: () => void;
  height: number;
  width: number;
  numColors: number;
  initCells: (height: number, width: number, numColors: number) => void;
  clearCellsAndCommit: (positions: number[]) => void;
}


// function Counter(array: Cell[], n: number) {
//   const count = new Array(n)
//   array.forEach(val => {
//     if (val !== 'blank')
//       count[val] = (count[val] || 0) + 1
//   });
//   return count;
// }

function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

const colorCounts = (state: GameStore) => {
  const counts: number[] = new Array(state.numColors)
  for (let i = 0; i < state.height * state.width; i++) {
    const cell = state.cells[i]
    if (cell !== 'blank' && !state.cleared[i]) {
      counts[cell] = (counts[cell] || 0) + 1
    }
  }
  return counts
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
  cleared: [],
  history: [],
  historyPtr: -1,
  undo: () => set((state) => {
    if (state.historyPtr >= 0) {
      for (const idx of state.history[state.historyPtr]) {
        state.cleared[idx] = false
      }
      state.historyPtr--
    }
    console.log('post undo:', state.historyPtr, state.history)
  }),
  redo: () => set((state) => {
    console.log('redo:', state.historyPtr, state.history)
    if (state.historyPtr < state.history.length - 1) {
      state.historyPtr++
      for (const idx of state.history[state.historyPtr]) {
        state.cleared[idx] = true
      }
    }
  }),
  undoUntilAllEven: () => set((state) => {
    const counts = colorCounts(state)
    while (state.historyPtr >= 0 && counts.filter(v => v % 2 === 1).length > 0) {
      const delta = state.history[state.historyPtr]
      console.log('undoing da bb', [...delta], [...counts])
      for (const idx of delta) {
        counts[state.cells[idx] as number]++
        state.cleared[idx] = false
      }
      state.historyPtr--
    }
  }),
  height: 15,
  width: 23,
  numColors: 10,
  initCells: (height, width, numColors) => set((state) => {
    state.history.length = 0
    state.historyPtr = -1
    state.width = width
    state.height = height
    state.numColors = numColors
    state.cells = new Array(height * width);
    state.cleared = new Array(height * width);
    const amt = Math.floor(height * width / numColors * 0.6);
    console.log(amt, "of each color")
    for (let i = 0; i < height * width; i++) {
      if (i >= amt * numColors) state.cells[i] = 'blank'
      else state.cells[i] = Math.floor(i / amt)
    }
    shuffleArray(state.cells)
  }),
  clearCellsAndCommit: (positions) => set((state) => {
    state.historyPtr++
    state.history.length = state.historyPtr
    state.history.push(positions)
    for (const pos of positions)
      state.cleared[pos] = true;
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
  const clearCellsAndCommit = useGameStore((state) => state.clearCellsAndCommit)
  const refs = useRef(new Array(height * width))
  const hovered = useRef([] as number[])
  const cleared = useGameStore((state) => state.cleared)

  const collect = (idx: number): number[] => {
    const sq = (idx: number) => cells[idx] === 'blank' || cleared[idx] ? 'blank' : cells[idx]

    if (sq(idx) !== 'blank') return []

    const i = Math.floor(idx / width)
    const j = idx % width
    const collected = []
    let k

    k = i - 1
    while (k >= 0 && sq(k * width + j) === 'blank') {
      k--;
    }
    if (k >= 0)
      collected.push(k * width + j)

    k = i + 1
    while (k < height && sq(k * width + j) === 'blank')
      k++
    if (k < height)
      collected.push(k * width + j)

    k = j - 1
    while (k >= 0 && sq(i * width + k) === 'blank')
      k--
    if (k >= 0)
      collected.push(i * width + k)

    k = j + 1
    while (k < width && sq(i * width + k) === 'blank')
      k++
    if (k < width)
      collected.push(i * width + k)
    return collected
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

  const validSquares = new Set(cells.map((cell, idx) => ({ cell, idx })).filter((v) => v.cell === 'blank' && commons(collect(v.idx)).length > 0).map(({ idx }) => idx))
  // const counts = Counter(cells, numColors)

  const handler = (idx: number) => {
    const collected = collect(idx)
    const clear = commons(collected)

    if (clear.length > 0)
      clearCellsAndCommit(clear)
  }

  if (loaded && validSquares.size === 0) {
    alert("GAME JOEVER!!!")
  }

  const alphabet = useGameStore((state) => state.alphabet)

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(' + width + ', 2rem)' }}>
      {cells.map((v, i) => {
        const square = cleared[i] ? 'blank' : v
        return (
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
              className="w-8 h-8 transition-all absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded text-slate-600"
              onClick={() => handler(i)}
              ref={e => refs.current[i] = e}
              style={{
                backgroundColor: colorCSS(square),
                borderRadius: validSquares.has(i) ? '0.4em' : '0.3em'
              }}
              disabled={square !== 'blank'}
            >
              {square === 'blank' ? ' ' : alphabet.charAt(square % alphabet.length)}
            </button>
          </div>
        )
      })}
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
  const undo = useGameStore((state) => state.undo)
  const canUndo = useGameStore((state) => state.historyPtr >= 0)
  const canRedo = useGameStore((state) => state.historyPtr < state.history.length - 1)
  const cnts = useGameStore((state) => colorCounts(state))
  const allEven = useGameStore((state) => colorCounts(state).filter(v => v % 2 === 1).length === 0)
  const undoUntilAllEven = useGameStore((state) => state.undoUntilAllEven)
  const redo = useGameStore((state) => state.redo)
  const onSubmit = handleSubmit(data => {
    useGameStore.getState().initCells(data.height, data.width, data.numColors)
  })
  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="min-h-screen flex flex-col justify-center items-center">
        <h1>color tiles by michael</h1>
        <div className="p-2 text-sm flex gap-4">
          <form onSubmit={onSubmit}>
            <label htmlFor="width" className="mx-2 py-1">width:</label>
            <input defaultValue="23" {...register('width', { valueAsNumber: true })} className="bg-stone-50 px-2 py-1 w-12" />
            <label htmlFor="height" className="mx-2 py-1">height:</label>
            <input defaultValue="15" {...register('height', { valueAsNumber: true })} className="bg-stone-50 px-2 py-1 w-12" />
            <label htmlFor="numColors" className="mx-2 py-1"># colors:</label>
            <input defaultValue="10" {...register('numColors', { valueAsNumber: true })} className="bg-stone-50 px-2 py-1 w-12" />
            <button type="submit" className="bg-lime-200 ml-2 px-2 py-1">new game</button>
          </form>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button onClick={() => undoUntilAllEven()} disabled={allEven}><ArrowsCounterClockwise size="1em" color={!allEven ? "#d13819" : "#dfdfdf"} weight="bold" /></button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content side="bottom" className="z-[1000] bg-slate-50 text-slate-600 px-1 py-0.5 rounded">
                undo until all color counts are even
                <Tooltip.Arrow className="fill-slate-50" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button onClick={() => undo()} disabled={!canUndo}><ArrowUUpLeft size="1em" weight="bold" color={canUndo ? "#d13819" : "#dfdfdf"} /></button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content side="bottom" className="z-[1000] bg-slate-50 text-slate-600 px-1 py-0.5 rounded">
                undo
                <Tooltip.Arrow className="fill-slate-50" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button onClick={() => redo()} disabled={!canRedo}><ArrowUUpRight size="1em" weight="bold" color={canRedo ? "#d13819" : "#dfdfdf"} /></button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content side="bottom" className="z-[1000] bg-slate-50 text-slate-600 px-1 py-0.5 rounded">
                redo
                <Tooltip.Arrow className="fill-slate-50" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <ToggleGroup.Root
            type="single"
            defaultValue="hiragana"
            onValueChange={(value: Alphabet) => {
              console.log("setting alphabet to", value)
              setAlphabet(value)
            }}
          >
            <ToggleGroup.Item value="hiragana" className="w-16 h-8 bg-amber-200 text-slate-600 data-[state=on]:border-2 border-slate-500">あいう</ToggleGroup.Item>
            <ToggleGroup.Item value="latin" className="w-16 h-8 bg-emerald-200 text-slate-600 data-[state=on]:border-2 border-slate-500">abc</ToggleGroup.Item>
            <ToggleGroup.Item value="number" className="w-16 h-8 bg-indigo-200 text-slate-600 data-[state=on]:border-2 border-slate-500">123</ToggleGroup.Item>
            <ToggleGroup.Item value="blank" className="w-16 h-8 bg-rose-200 text-slate-600 data-[state=on]:border-2 border-slate-500">&nbsp;</ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
        <Game width={width} height={height} numColors={numColors} />
      </div>
    </Tooltip.Provider>
  )
}

export default App
