import { useState } from 'react';

interface CreateEndpointProps {
  onCreateEndpoint: (name: string) => Promise<void>;
}

export const CreateEndpoint = ({ onCreateEndpoint }: CreateEndpointProps) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isCreating) {
      setIsCreating(true);
      try {
        await onCreateEndpoint(name.trim());
        setName('');
      } catch (error) {
        console.error('Error creating endpoint:', error);
      } finally {
        setIsCreating(false);
      }
    }
  };

  return (
    <div className="create-endpoint">
      <h2>Create New Endpoint</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="endpoint-name">Endpoint Name:</label>
          <input
            id="endpoint-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Webhook"
            required
          />
        </div>
        <button type="submit" disabled={!name.trim() || isCreating}>
          {isCreating ? 'Creating...' : 'Create Endpoint'}
        </button>
      </form>
    </div>
  );
};