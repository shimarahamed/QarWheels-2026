import { createContext, useContext } from 'react';

export const VendorFeedStatusContext = createContext({ loading: true, error: false, retry: () => {} });
export const useVendorFeedStatus = () => useContext(VendorFeedStatusContext);
