import { useState, useEffect } from "react";
import api from "../api";

const Orders = () => {
  const [orderName, setOrderName] = useState("");
  const [items, setItems] = useState([{ product_name: "", quantity: 1, price: 0.01 }]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [existingOrders, setExistingOrders] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    fetchExistingOrders();
  }, []);

  const fetchExistingOrders = async () => {
    try {
      const res = await api.get("/orders/");
      setExistingOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === "price") {
      const priceValue = Math.max(0.01, parseFloat(value) || 0.01);
      newItems[index][field] = priceValue;
    } else if (field === "quantity") {
      const qtyValue = Math.max(1, parseInt(value) || 1);
      newItems[index][field] = qtyValue;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_name: "", quantity: 1, price: 0.01 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      setMessage(`Item ${index + 1} removed`);
      setTimeout(() => setMessage(""), 2000);
    } else {
      const newItems = [{ product_name: "", quantity: 1, price: 0.01 }];
      setItems(newItems);
      setMessage("Cleared the last item");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const clearAllItems = () => {
    setItems([{ product_name: "", quantity: 1, price: 0.01 }]);
    setMessage("All items cleared");
    setTimeout(() => setMessage(""), 2000);
  };

  const loadOrderForEdit = (order) => {
    setEditingOrder(order);
    setOrderName(order.name);
    setItems(order.items.map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      price: parseFloat(item.price)
    })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMessage(`Editing order: ${order.name}`);
    setTimeout(() => setMessage(""), 3000);
  };

  const cancelEdit = () => {
    setEditingOrder(null);
    setOrderName("");
    setItems([{ product_name: "", quantity: 1, price: 0.01 }]);
    setMessage("Edit cancelled");
    setTimeout(() => setMessage(""), 2000);
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) {
      return;
    }

    try {
      await api.delete(`/orders/${orderId}/`);
      setMessage("Order deleted successfully!");
      fetchExistingOrders();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || "Error deleting order");
    }
  };

  const submitOrder = async () => {
    const hasEmptyProductNames = items.some(item => !item.product_name.trim());
    if (hasEmptyProductNames) {
      setMessage("❌ Please fill in product names for all items");
      return;
    }

    const hasInvalidPrice = items.some(item => item.price <= 0);
    if (hasInvalidPrice) {
      setMessage("❌ Price must be greater than 0 for all items");
      return;
    }

    if (!orderName.trim()) {
      setMessage("❌ Please enter an order name");
      return;
    }

    setIsLoading(true);
    try {
      if (editingOrder) {
        await api.put(`/orders/${editingOrder.id}/`, { 
          name: orderName, 
          items: items.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price
          }))
        });
        setMessage("✅ Order updated successfully!");
      } else {
        await api.post("/orders/", { 
          name: orderName, 
          items: items.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price
          }))
        });
        setMessage("✅ Order created successfully!");
      }
      
      setOrderName("");
      setItems([{ product_name: "", quantity: 1, price: 0.01 }]);
      setEditingOrder(null);
      fetchExistingOrders();
      
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      const errorMsg = err.response?.data;
      if (typeof errorMsg === 'object') {
        if (errorMsg.items) {
          setMessage(`❌ ${errorMsg.items.join(', ')}`);
        } else if (errorMsg.name) {
          setMessage(`❌ ${errorMsg.name.join(', ')}`);
        } else {
          setMessage("❌ Error processing order");
        }
      } else {
        setMessage(err.response?.data?.error || "❌ Error processing order");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2);
  };

  const getItemValidationStatus = (item) => {
    if (!item.product_name.trim()) return "invalid";
    if (item.quantity <= 0) return "invalid";
    if (item.price <= 0) return "invalid";
    return "valid";
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-neonGreen-400 text-3xl font-bold mb-2 flex items-center">
            {editingOrder ? `Edit Order: ${editingOrder.name}` : 'Create New Order'}
          </h2>
          <p className="text-gray-400">
            {editingOrder 
              ? 'Update the order details below' 
              : 'Add products and quantities to create an order'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <label className="block text-neonGreen-300 mb-2 font-medium">Order Name *</label>
              <input
                className="p-3 w-full bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-neonGreen-500 focus:ring-2 focus:ring-neonGreen-500/30 outline-none transition-all"
                placeholder="e.g., Weekly Supply Order"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <h3 className="text-xl font-semibold text-white">Order Items ({items.length})</h3>
                <div className="flex gap-3">
                  <div className="text-neonGreen-400 font-bold text-lg">
                    Total: ETB {calculateTotal()}
                  </div>
                  {items.length > 1 && (
                    <button
                      className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-all"
                      onClick={clearAllItems}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {items.map((item, idx) => {
                const isValid = getItemValidationStatus(item);
                
                return (
                  <div 
                    key={idx} 
                    className={`mb-4 p-4 rounded-lg border transition-all relative group ${
                      isValid === "valid" 
                        ? "bg-gray-800/50 border-gray-700 hover:border-neonGreen-500/50" 
                        : "bg-red-900/20 border-red-700/50 hover:border-red-500"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                          isValid === "valid" ? "bg-neonGreen-500/20 text-neonGreen-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="font-medium text-white">Item {idx + 1}</span>
                        {isValid === "invalid" && (
                          <span className="ml-3 text-sm text-red-400 flex items-center">
                            Incomplete
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-all"
                        title="Remove this item"
                        aria-label="Remove item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-gray-400 text-sm mb-1">
                          Product Name {!item.product_name.trim() && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          className={`p-2 w-full bg-gray-900 text-white rounded border outline-none transition-all ${
                            !item.product_name.trim() 
                              ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                              : "border-gray-700 focus:border-neonGreen-500 focus:ring-1 focus:ring-neonGreen-500"
                          }`}
                          placeholder="Enter product name"
                          value={item.product_name}
                          onChange={(e) => handleItemChange(idx, "product_name", e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">
                          Quantity {item.quantity <= 0 && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="number"
                          min="1"
                          className={`p-2 w-full bg-gray-900 text-white rounded border outline-none transition-all ${
                            item.quantity <= 0 
                              ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                              : "border-gray-700 focus:border-neonGreen-500 focus:ring-1 focus:ring-neonGreen-500"
                          }`}
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">
                          Price (ETB) {item.price <= 0 && <span className="text-red-400">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className={`p-2 w-full bg-gray-900 text-white rounded border outline-none transition-all ${
                              item.price <= 0 
                                ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                                : "border-gray-700 focus:border-neonGreen-500 focus:ring-1 focus:ring-neonGreen-500"
                            }`}
                            placeholder="0.01"
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                          />
                          <div className="absolute right-3 top-2 text-neonGreen-400 font-semibold">
                            ETB {(item.quantity * item.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
              <button
                className="px-6 py-3 bg-neonGreen-800 hover:bg-neonGreen-700 text-white rounded-lg font-medium flex items-center transition-all hover:scale-105 active:scale-95"
                onClick={addItem}
              >
                <span className="mr-2">+</span> Add Another Item
              </button>
              
              {editingOrder && (
                <button
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center transition-all hover:scale-105 active:scale-95"
                  onClick={cancelEdit}
                >
                  Cancel Edit
                </button>
              )}
              
              <button
                className={`px-8 py-3 bg-gradient-to-r from-neonGreen-800 to-neonGreen-500 hover:from-neonGreen-500 hover:to-neonGreen-600 text-white rounded-lg font-bold flex items-center transition-all hover:scale-105 active:scale-95 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                onClick={submitOrder}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : editingOrder ? (
                  'Update Order'
                ) : (
                  'Submit Order'
                )}
              </button>
            </div>

            {items.some(item => getItemValidationStatus(item) === "invalid") && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h4 className="text-red-400 font-medium">Some items need attention:</h4>
                </div>
                <ul className="text-red-300 text-sm list-disc pl-5 space-y-1">
                  <li>All products must have a name</li>
                  <li>Quantity must be at least 1</li>
                  <li>Price must be greater than ETB 0.00</li>
                  <li>Remove incorrect items using the delete button</li>
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                Existing Orders
              </h3>
              
              {existingOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No orders created yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {existingOrders.map(order => (
                    <div 
                      key={order.id} 
                      className="p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-neonGreen-500/50 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-white">{order.name}</h4>
                          <p className="text-sm text-gray-400">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-neonGreen-400 font-bold">
                          ETB {parseFloat(order.total_value || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                          {order.items?.length || 0} items
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadOrderForEdit(order)}
                            className="px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-sm transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded-lg animate-slide-up ${
            message.includes("success") || message.includes("cancelled") || message.includes("deleted") || message.includes("✅")
              ? 'bg-neonGreen-900/30 border border-neonGreen-500' 
              : message.includes("Error") || message.includes("❌")
              ? 'bg-red-900/30 border border-red-500'
              : 'bg-blue-900/30 border border-blue-500'
          }`}>
            <div className="flex items-center">
              {message.includes("success") || message.includes("✅") ? (
                <span className="mr-2">🎉</span>
              ) : message.includes("❌") ? (
                <span className="mr-2">❌</span>
              ) : (
                <span className="mr-2">ℹ️</span>
              )}
              <p className={`font-medium ${
                message.includes("success") || message.includes("✅") ? 'text-neonGreen-400' : 
                message.includes("❌") ? 'text-red-400' : 
                'text-blue-400'
              }`}>
                {message}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;