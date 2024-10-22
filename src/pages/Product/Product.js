import { debounce } from 'lodash';
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addServerCart, addLocalCart } from "../../utils/cartUtils";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './Product.css';
import { Modal } from 'react-bootstrap';
import {useAuth} from "../../context/AuthContext";
import {useCart} from "../../context/CartContext";
import ProductRate from "./ProductRate";

function SandboxApp() {
    const [items, setItems] = useState([]);
    const [selectedOptions, setSelectedOptions] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [hoveredImages, setHoveredImages] = useState({});
    const { categoryId } = useParams();
    const [animationKey, setAnimationKey] = useState(0);
    const MODAL_DURATION = 1000;

    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);


    const { isLoggedIn, email, setIsLoggedIn } = useAuth();
    const {loadCartData} = useCart();

    useEffect(() => {
        const fetchProducts = async () => {
            // setItems([]);
            // setCurrentPage(0);
            try {
                if (!categoryId || categoryId === 'all') {
                    const response = await fetch(`http://localhost:8080/api/products/all-pages?page=${currentPage}&size=9`);
                    const data = await response.json();
                    setItems(prevItems => currentPage === 0 ? data.content : [...prevItems, ...data.content]);
                    setHasMore(data.content.length > 0);

                } else {
                    const categoryResponse = await fetch(`http://localhost:8080/api/category?categoryIds=${categoryId}`);
                    const categoryIds = await categoryResponse.json();

                    const queryParams = categoryIds.map(id => `categoryIds=${id}`).join('&');
                    const productResponse = await fetch(`http://localhost:8080/api/products/categories?${queryParams}`);
                    const products = await productResponse.json();
                    setItems(products);
                    setHasMore(false);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            }
        };

        fetchProducts();
    }, [categoryId, currentPage]);

    const loadMoreItems = () => {
        if (hasMore) {
            setCurrentPage(prevPage => prevPage + 1);
        }
    };

    const handleScroll = debounce(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        if (scrollTop + windowHeight >= documentHeight - 10 && hasMore && !loading) {
            setLoading(true);
            setTimeout(() => {
                loadMoreItems();
                setLoading(false);
            }, 1000);
        }
    }, 1000); // 5초 내에 반복 호출 방지

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [hasMore, loading]);

    const showModalMessage = (message) => {
        setModalMessage(message);
        setShowModal(true);
        setTimeout(() => setShowModal(false), MODAL_DURATION);
    };

    const addToCart = (item) => {
        const selectedDetail = selectedOptions[item.id] || item.productDetails[0];
        const cartItem = {
            optionId: selectedDetail.id,
            quantity: 1,
        };

        if (isLoggedIn) {
            addServerCart(cartItem, email);
        } else {
            addLocalCart(cartItem, selectedDetail);
        }
        loadCartData();
        showModalMessage(`${item.name}의 ${selectedDetail.name}이(가) 장바구니에 추가되었습니다.`);
    };

    const handleOptionSelect = (itemId, detail) => {
        setSelectedOptions(prevOptions => ({
            ...prevOptions,
            [itemId]: detail,
        }));
    };

    const groupedItems = [];
    for (let i = 0; i < items.length; i += 3) {
        groupedItems.push(items.slice(i, i + 3));
    }

    const handleMouseEnter = (itemId, mainImage) => {
        setHoveredImages(prevImages => ({
            ...prevImages,
            [itemId]: mainImage
        }));
    };

    const handleMouseLeave = (itemId) => {
        setHoveredImages(prevImages => {
            const newImages = { ...prevImages };
            delete newImages[itemId];
            return newImages;
        });
    };

    return (
        <section key={animationKey}>
            <div className="container" style={{ width: '100%'}}>
                <div className="row d-flex justify-content-center align-items-center h-100">
                    <div className="card-body p-3">
                        <div className="row g-0">
                            <div className="col-lg-12">
                                <div className="p-3">
                                    {groupedItems.map((group, groupIndex) => (
                                        <React.Fragment key={groupIndex}>
                                            <div className="row">
                                                {group.map((item, itemIndex) => {
                                                    const selectedDetail = selectedOptions[item.id] || item.productDetails[0];
                                                    const hoveredImage = hoveredImages[item.id] || selectedDetail.mainImage;

                                                    return (
                                                        <div
                                                            className="card col-md-3 col-xl-4 border-0"
                                                            key={item.id}
                                                            style={{ animationDelay: `${(groupIndex * 3 + itemIndex) * 0.1}s` }}
                                                        >
                                                            <div>

                                                                <Link to={`/category/${categoryId}/product-detail?productId=${item.id}&optionId=${selectedDetail.id}`}>
                                                                    <img
                                                                        src={hoveredImage}
                                                                        className="card-img-top"
                                                                        alt="Item Image"
                                                                        onMouseEnter={() =>
                                                                            handleMouseEnter(item.id, item.productImages[0].imageUrl)
                                                                        }
                                                                        onMouseLeave={() => handleMouseLeave(item.id)}
                                                                    />
                                                                </Link>
                                                                <div className="d-flex justify-content-between">
                                                                    <div className="card-body">
                                                                        <Link
                                                                            to={`/category/${categoryId}/product-detail?productId=${item.id}&optionId=${selectedDetail.id}`}>
                                                                            <h6 className="card-title fw-bolder" style={{fontSize: '14px'}}>{item.name}</h6>
                                                                            <h6 style={{fontSize: '12px'}}>{selectedDetail.name}</h6>
                                                                            <h6 className="fw-bolder">
                                                                                ￦{selectedDetail.price.toLocaleString()}
                                                                            </h6>
                                                                            <ProductRate productId={item.id}/>
                                                                        </Link>
                                                                        <div>
                                                                            {/*<h6 style={{ fontSize: '12px' }}>옵션</h6>*/}
                                                                            <div
                                                                                className="thumbnail-container d-flex mb-3 gap-2">
                                                                                {item.productDetails.map((detail, index) => (
                                                                                    <div key={index}
                                                                                         style={{position: 'relative'}}>
                                                                                        <img
                                                                                            src={detail.mainImage}
                                                                                            alt={`Thumbnail ${index + 1}`}
                                                                                            className="thumbnail-image"
                                                                                            style={{
                                                                                                width: '45px',
                                                                                                cursor: 'pointer'
                                                                                            }}
                                                                                            onClick={() =>
                                                                                                handleOptionSelect(item.id, detail)
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div className="d-flex justify-content-end">
                                                                            <button
                                                                                className="btn btn-dark btn-sm col-xl-12  rounded-1"
                                                                                onClick={() => addToCart(item)}>
                                                                                <i className="bi bi-cart mx-1"
                                                                                   style={{
                                                                                       fontSize: '1rem',

                                                                                   }}></i>

                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    {/*<button*/}
                                                                    {/*    className="btn btn-outline-dark border-2 rounded-2"*/}
                                                                    {/*    onClick={() => addToCart(item)}>*/}
                                                                    {/*    <i className="bi bi-bag-plus" style={{fontWeight: 'bolder'}}></i>*/}
                                                                    {/*</button>*/}

                                                                </div>
                                                            </div>
                                                            <hr/>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                                {loading && (
                                    <div className="d-flex justify-content-center align-items-center">
                                        <div className="spinner-border" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Body>{modalMessage}</Modal.Body>
            </Modal>
        </section>
    );
}

export default SandboxApp;
