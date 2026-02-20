---
name: code-optimize
description: 代碼優化規範。當需要重構、優化或審查代碼品質時使用此 skill。確保代碼符合單一職責、可讀性與維護性。
metadata:
  version: "2.0"
  framework: reactjs
---

# 代碼優化規範

## 1. 註解規範

所有 props interface 屬性、自訂 hooks、工具函式必須加上 JSDoc 註解。

### Props 註解
```typescript
interface IProps {
    /** 是否展開選單 */
    isExpand?: boolean
    /** 選單項目列表 */
    items: MenuItem[]
    /** 點擊項目時觸發 */
    onItemClick?: (item: MenuItem) => void
}
```

### 函式註解（必須包含 @param 和 @returns）

```typescript
// ✅ 正確：完整的函式註解
/**
 * 切換選單狀態
 * @param status - 目標狀態
 * @returns 是否切換成功
 */
const toggleMenu = (status: boolean): boolean => {
    // ...
};

/**
 * 取得可見項目
 * @returns 過濾後的可見項目陣列
 */
const getVisibleItems = (): MenuItem[] => {
    return items.filter(item => item.isVisible);
};

/**
 * 計算項目總價
 * @param items - 項目陣列
 * @param discount - 折扣比例（0-1）
 * @returns 計算後的總價
 */
const calculateTotal = (items: Item[], discount: number): number => {
    return items.reduce((sum, item) => sum + item.price, 0) * (1 - discount);
};

// ❌ 錯誤：缺少 @param 和 @returns
/**
 * 切換選單狀態
 */
const toggleMenu = (status: boolean): boolean => {
    // ...
};

// ❌ 錯誤：完全沒有註解
const toggleMenu = (status: boolean): boolean => {
    // ...
};
```

### 元件註解

```typescript
/**
 * Component / Molecules @ 選單元件
 * @param isExpand - 是否展開
 * @param items - 選單項目
 */
const Menu = ({
    isExpand = true,
    items,
}: IProps) => {
    // ...
};
```

### 無參數或 void 回傳

```typescript
// 無參數時省略 @param，void 回傳時省略 @returns
/**
 * 重置選單狀態
 */
const reset = (): void => {
    setIsExpand(false);
};

// 有參數但無回傳
/**
 * 更新選單位置
 * @param offset - 偏移量（像素）
 */
const updatePosition = (offset: number): void => {
    setPosition(offset);
};
```

## 2. 早期返回模式 (Early Return)

避免 `if-else` 巢狀，改用早期返回提升可讀性：

```typescript
// ❌ 錯誤：if-else 巢狀
const updatePosition = () => {
    if (containerRef.current) {
        if (isExpand) {
            const target = findTarget();
            if (target) {
                setOffset(target.offsetTop);
            } else {
                setOffset(0);
            }
        } else {
            setOffset(0);
        }
    } else {
        setOffset(0);
    }
};

// ✅ 正確：早期返回
const updatePosition = () => {
    if (!containerRef.current) {
        setOffset(0);
        return;
    }

    if (!isExpand) {
        setOffset(0);
        return;
    }

    const target = findTarget();
    if (!target) {
        setOffset(0);
        return;
    }

    setOffset(target.offsetTop);
};
```

## 3. 函數式陣列操作

避免 `push`，優先使用 `map`、`filter`、`reduce` 等函數式方法：

```typescript
// ❌ 錯誤：使用 push
const getVisibleItems = (): Item[] => {
    const result: Item[] = [];
    for (const item of items) {
        if (item.isVisible) {
            result.push({
                ...item,
                label: item.name.toUpperCase()
            });
        }
    }
    return result;
};

// ✅ 正確：函數式寫法
const visibleItems = useMemo(() => {
    return items
        .filter(item => item.isVisible)
        .map(item => ({
            ...item,
            label: item.name.toUpperCase()
        }));
}, [items]);

// ✅ 正確：需要累加時使用 reduce
const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);
```

## 4. 檔案分離原則

元件、型別、樣式、資料分離至獨立檔案：

```
ComponentName/
├── ComponentName.tsx   # 元件邏輯與 JSX
├── types.ts            # 型別定義 (interface / type)
├── data.ts             # 假資料或常數
└── index.ts            # 匯出入口
```

```typescript
// ❌ 錯誤：型別與元件寫在一起、inline styles
const Menu = ({items}: {items: MenuItem[]}) => {
    return <div style={{padding: 16}}>...</div>;
};

// ✅ 正確：分離型別，使用 styled-components
// types.ts
interface IProps {
    /** 選單項目 */
    items: MenuItem[]
}

// Menu.tsx
import {IProps} from './types';

const Menu = ({items}: IProps) => {
    return <MenuRoot>...</MenuRoot>;
};

const MenuRoot = styled.div`
    padding: 16px;
`;
```

## 5. 棄用標記

未被使用的代碼必須標記 `@deprecated` 並說明替代方案：

```typescript
/**
 * @deprecated 請改用 `useNewHook()`，將於 v2.0 移除
 */
const useOldHook = () => {
    console.warn('useOldHook is deprecated, use useNewHook instead');
    return useNewHook();
};

/**
 * @deprecated 請改用 `isExpand` prop
 */
interface IProps {
    /** @deprecated 請改用 isExpand */
    expanded?: boolean
    isExpand?: boolean
}
```

## 6. 單一職責原則 (SRP)

每個元件、hook、函式只負責一件事：

### 元件職責分離

```typescript
// ❌ 錯誤：混合多個職責
const Menu = ({items}: IProps) => {
    // 職責1: UI 渲染
    const [isOpen, setIsOpen] = useState(false);

    // 職責2: 拖動邏輯
    const [isDragging, setIsDragging] = useState(false);
    const onDragStart = () => { /* ... */ };
    const onDragMove = () => { /* ... */ };
    const onDragEnd = () => { /* ... */ };

    // 職責3: 通知管理
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const showNotification = () => { /* ... */ };

    return <div>...</div>;
};

// ✅ 正確：分離職責
// 拖動邏輯抽離至自訂 hook
const useDraggable = () => {
    const [isDragging, setIsDragging] = useState(false);
    const onDragStart = useCallback(() => { /* ... */ }, []);
    const onDragMove = useCallback(() => { /* ... */ }, []);
    const onDragEnd = useCallback(() => { /* ... */ }, []);
    return {isDragging, onDragStart, onDragMove, onDragEnd};
};

// 元件只負責 UI 渲染
const Menu = ({items, isDragging, notification}: IProps) => {
    const [isOpen, setIsOpen] = useState(false);
    return <MenuRoot>...</MenuRoot>;
};
```

### 控制邏輯由父元件管理

子元件只負責「做一件事」，控制邏輯由父元件管理：

```typescript
// ❌ 錯誤：子元件自己管理循序播放邏輯
const IconButton = ({animationDelay, animationCycleDuration}: IProps) => {
    useEffect(() => {
        const timer = setTimeout(() => play(), animationCycleDuration);
        return () => clearTimeout(timer);
    }, [animationCycleDuration]);
    // ...
};

// ✅ 正確：子元件只負責播放，父元件控制順序
const IconButton = ({isPlaying, onAnimationComplete}: IProps) => {
    // 子元件職責單純：播放動畫、發出完成事件
    return <Button />;
};

const Menu = ({items}: IProps) => {
    const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0);

    const handleAnimationComplete = useCallback((index: number) => {
        setCurrentPlayingIndex((index + 1) % items.length);
    }, [items.length]);

    return <>
        {items.map((item, index) => (
            <IconButton
                key={item.id}
                isPlaying={currentPlayingIndex === index}
                onAnimationComplete={() => handleAnimationComplete(index)}
            />
        ))}
    </>;
};
```

## 7. 方法長度限制

單一函式不超過 20 行，超過則拆分：

```typescript
// ❌ 錯誤：函式過長
const processData = () => {
    // 驗證
    if (!data) return;
    if (!data.items) return;

    // 過濾
    const filtered = data.items.filter(/* ... */);

    // 轉換
    const transformed = filtered.map(/* ... */);

    // 排序
    const sorted = transformed.sort(/* ... */);

    // 更新
    setResult(sorted);
    updateUI();
    notifyParent();
};

// ✅ 正確：拆分為小函式
const isValidData = (data: Data | null): data is Data => {
    return !!data?.items;
};

const transformData = (items: Item[]): Item[] => {
    return items
        .filter(item => item.isActive)
        .map(item => ({...item, processed: true}))
        .sort((a, b) => a.order - b.order);
};

const processData = () => {
    if (!isValidData(data)) return;

    setResult(transformData(data.items));
    updateUI();
    notifyParent();
};
```

## 8. 命名規範

```typescript
// 布林值使用 is/has/can/should 前綴
const [isExpand, setIsExpand] = useState(false);
const [hasNotification, setHasNotification] = useState(false);
const [canEdit, setCanEdit] = useState(true);

// 事件處理使用 handle 前綴，回呼 prop 使用 on 前綴
interface IProps {
    onItemClick?: (item: Item) => void
    onToggle?: (isOpen: boolean) => void
}

const handleItemClick = (item: Item) => {
    onItemClick?.(item);
};

// 自訂 hook 使用 use 前綴
const useMenuState = () => { /* ... */ };
const useDraggable = () => { /* ... */ };
```

## 9. 禁止使用 any

如果是 global 方法，例如 window 下的自定義，需定義在 src/types/global.d.ts 中

其他情況需提供型別，如果是自己使用的，放在自己歸屬的路徑下

如果不屬於誰的，屬於專案本身，則放在共用的地方


## 10. 效能考慮

優先順序為閱讀性，次要為效能考慮，避免造成頻繁渲染的寫法：

```typescript
// ❌ 錯誤：每次渲染都建立新物件/函式
const Menu = ({items}: IProps) => {
    return items.map(item => (
        <Item
            key={item.id}
            style={{color: 'red'}}
            onClick={() => handleClick(item.id)}
        />
    ));
};

// ✅ 正確：使用 useMemo / useCallback 避免不必要的重渲染
const Menu = ({items}: IProps) => {
    const handleClick = useCallback((id: string) => {
        // ...
    }, []);

    return items.map(item => (
        <Item
            key={item.id}
            id={item.id}
            onClick={handleClick}
        />
    ));
};
```

## 快速檢查清單

優化代碼時，逐項確認：

- [ ] 所有 props interface 屬性、自訂 hooks、工具函式都有 JSDoc 註解
- [ ] 沒有超過 2 層的 `if-else` 巢狀
- [ ] 沒有使用 `array.push()`，改用 `map`/`filter`/`reduce`
- [ ] 型別、元件、樣式分離至獨立檔案
- [ ] 未使用的代碼標記 `@deprecated`
- [ ] 每個元件/hook/函式只有單一職責
- [ ] 函式不超過 20 行
- [ ] 命名符合規範（is/has/can、handle/on、use）
- [ ] 型別規範（禁止 any）
- [ ] 效能考慮（useMemo / useCallback）
