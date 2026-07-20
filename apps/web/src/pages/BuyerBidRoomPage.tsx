import { useNavigate, useParams } from 'react-router-dom';
import { BuyerBidRoom } from '../console/sections/BuyerBidRoom';

/** Public route wrapper around the bid room, reached from the `/bids` board. */
export function BuyerBidRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) { navigate('/bids', { replace: true }); return null; }
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <BuyerBidRoom id={id} onBack={() => navigate('/bids')} />
    </div>
  );
}
