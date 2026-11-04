import * as React from 'react';
import { render, screen } from '@testing-library/react-native';

import { MonoText } from '../StyledText';

it(`renders correctly`, async () => {
  await render(<MonoText>Snapshot test!</MonoText>);
  expect(screen.getByText('Snapshot test!')).toHaveStyle({ fontFamily: 'SpaceMono' });
});
