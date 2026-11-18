import { ApiError } from '@/api/errors';
import { cancelErrorKey, orderCancelState, ORDER_ON_ITS_WAY } from '@/features/orders/order-cancel';

describe('order cancel state', () => {
  it('lets the chef cancel until the order is on its way', () => {
    expect(orderCancelState('draft')).toBe('cancellable');
    expect(orderCancelState('submitted')).toBe('cancellable');
    expect(orderCancelState('confirmed')).toBe('cancellable');
  });

  it('blocks cancel once the order is on its way', () => {
    expect(orderCancelState('out_for_delivery')).toBe('on_its_way');
  });

  it('offers nothing for delivered or cancelled orders', () => {
    expect(orderCancelState('delivered')).toBe('not_cancellable');
    expect(orderCancelState('cancelled')).toBe('not_cancellable');
  });

  it('maps the server refusal to the on-its-way message', () => {
    const refused = new ApiError('conflict', 'on its way', { status: 409, errorCode: ORDER_ON_ITS_WAY });
    expect(cancelErrorKey(refused)).toBe('orders.onItsWay');
    expect(cancelErrorKey(new ApiError('conflict', 'x', { status: 409, errorCode: 'CONFLICT' }))).toBe(
      'orders.cancelFailed',
    );
    expect(cancelErrorKey(new Error('offline'))).toBe('orders.cancelFailed');
  });
});
