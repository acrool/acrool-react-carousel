import '@testing-library/jest-dom';

import {render, screen} from '@testing-library/react';

import SlideItem from './SlideItem';

test('test Slide item render', async () => {
    // ARRANGE
    render(<SlideItem
        element={<div>test</div>}
        isActive
        index={1}
        virtualIndex={1}
        matchIndex={1}
        sourceIndex={1}
        inPage={1}
    />);

    // ACT
    const element = screen.getByTestId('acrool-carousel-slideItem');

    // ASSERT
    expect(element).toBeInTheDocument();
});
