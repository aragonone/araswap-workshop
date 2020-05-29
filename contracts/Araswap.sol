pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";


contract Araswap is AragonApp {
    using SafeMath for uint256;

    uint256 private constant BASE_PCT = 1000000;

    /// Events
    event TokenPurchase(
        address indexed buyer,
        uint256 indexed eth_sold,
        uint256 indexed tokens_bought
    );
    event EthPurchase(
        address indexed buyer,
        uint256 indexed tokens_sold,
        uint256 indexed eth_bought
    );
    event AddLiquidity(
        address indexed provider,
        uint256 indexed eth_amount,
        uint256 indexed token_amount
    );
    event RemoveLiquidity(
        address indexed provider,
        uint256 indexed eth_amount,
        uint256 indexed token_amount
    );

    /// State
    ERC20 public token;
    TokenManager public liquidityTokenManager;
    uint256 public feePct; // fee in ppm

    /// ACL
    bytes32 public constant CHANGE_FEES_ROLE = keccak256("CHANGE_FEES_ROLE");

    function initialize(
        ERC20 _token,
        TokenManager _liquidityTokenManager,
        uint256 _feePct
    ) public onlyInit {
        initialized();

        require(isContract(_token));
        require(isContract(_liquidityTokenManager));

        token = _token;
        liquidityTokenManager = _liquidityTokenManager;
        _setFeePct(_feePct);
    }

    /**
     * @notice Convert ETH to Tokens.
     * @dev User specifies exact input (msg.value).
     * @dev User cannot specify minimum output or deadline.
     */
    function() external payable isInitialized {
        _ethToTokenInput(msg.value, 1, block.timestamp, msg.sender, msg.sender);
    }

    /**
     * @notice Convert ETH to Tokens.
     * @dev User specifies exact input (msg.value) && minimum output.
     * @param min_tokens Minimum Tokens bought.
     * @param deadline Time after which this transaction can no longer be executed.
     * @return Amount of Tokens bought.
     */
    function ethToTokenSwapInput(uint256 min_tokens, uint256 deadline)
        external
        payable
        isInitialized
        returns (uint256)
    {
        return
            _ethToTokenInput(
                msg.value,
                min_tokens,
                deadline,
                msg.sender,
                msg.sender
            );
    }

    /**
     * @notice Convert Tokens to ETH.
     * @dev User specifies exact input && minimum output.
     * @param tokens_sold Amount of Tokens sold.
     * @param min_eth Minimum ETH purchased.
     * @param deadline Time after which this transaction can no longer be executed.
     * @return Amount of ETH bought.
     */
    function tokenToEthSwapInput(
        uint256 tokens_sold,
        uint256 min_eth,
        uint256 deadline
    ) external isInitialized returns (uint256) {
        return
            _tokenToEthInput(
                tokens_sold,
                min_eth,
                deadline,
                msg.sender,
                msg.sender
            );
    }

    /**
     * @notice Deposit ETH && Tokens (token) at current ratio to mint Liquidity Tokens.
     * @dev min_liquidity does nothing when total Liquidity Tokens supply is 0.
     * @param min_liquidity Minimum number of Liquidity Tokens sender will mint if total Liquidity Tokens supply is greater than 0.
     * @param max_tokens Maximum number of tokens deposited. Deposits max amount if total Liquidity Tokens supply is 0.
     * @param deadline Time after which this transaction can no longer be executed.
     * @return The amount of Liquidity Tokens minted.
     */
    function addLiquidity(
        uint256 min_liquidity,
        uint256 max_tokens,
        uint256 deadline
    ) external payable isInitialized returns (uint256) {
        require(
            deadline > block.timestamp && max_tokens > 0 && msg.value > 0,
            "addLiquidity: INVALID_ARGUMENT"
        );
        uint256 total_liquidity = liquidityTokenManager.token().totalSupply();

        uint256 token_amount;
        if (total_liquidity > 0) {
            require(min_liquidity > 0);
            uint256 eth_reserve = address(this).balance.sub(msg.value);
            uint256 token_reserve = token.balanceOf(address(this));
            token_amount = (msg.value.mul(token_reserve) / eth_reserve).add(1);
            uint256 liquidity_minted = msg.value.mul(total_liquidity) /
                eth_reserve;
            require(
                max_tokens >= token_amount && liquidity_minted >= min_liquidity
            );

            // mint new liqudity tokens
            liquidityTokenManager.mint(msg.sender, liquidity_minted);

            require(
                token.transferFrom(msg.sender, address(this), token_amount)
            );

            emit AddLiquidity(msg.sender, msg.value, token_amount);

            return liquidity_minted;
        } else {
            // initial liquidity
            require(msg.value >= 1000000000, "INVALID_VALUE");

            token_amount = max_tokens;
            uint256 initial_liquidity = address(this).balance;
            // mint new liqudity tokens
            liquidityTokenManager.mint(msg.sender, initial_liquidity);

            require(
                token.transferFrom(msg.sender, address(this), token_amount)
            );

            emit AddLiquidity(msg.sender, msg.value, token_amount);

            return initial_liquidity;
        }
    }

    /**
     * @dev Burn Liquidity Tokens to withdraw ETH && Tokens at current ratio.
     * @param amount Amount of Liquidity Tokens burned.
     * @param min_eth Minimum ETH withdrawn.
     * @param min_tokens Minimum Tokens withdrawn.
     * @param deadline Time after which this transaction can no longer be executed.
     * @return The amount of ETH && Tokens withdrawn.
     */
    function removeLiquidity(
        uint256 amount,
        uint256 min_eth,
        uint256 min_tokens,
        uint256 deadline
    ) external returns (uint256, uint256) {
        require(
            amount > 0 &&
                deadline > block.timestamp &&
                min_eth > 0 &&
                min_tokens > 0
        );

        uint256 total_liquidity = liquidityTokenManager.token().totalSupply();
        require(total_liquidity > 0);

        uint256 token_reserve = token.balanceOf(address(this));
        uint256 eth_amount = amount.mul(address(this).balance) /
            total_liquidity;
        uint256 token_amount = amount.mul(token_reserve) / total_liquidity;
        require(eth_amount >= min_eth && token_amount >= min_tokens);

        // burn liqudity tokens
        liquidityTokenManager.burn(msg.sender, amount);

        msg.sender.transfer(eth_amount);
        require(token.transfer(msg.sender, token_amount));

        emit RemoveLiquidity(msg.sender, eth_amount, token_amount);

        return (eth_amount, token_amount);
    }

    /**
     * @notice Public price function for ETH to Token trades with an exact input.
     * @param eth_sold Amount of ETH sold.
     * @return Amount of Tokens that can be bought with input ETH.
     */
    function getEthToTokenInputPrice(uint256 eth_sold)
        external
        view
        returns (uint256)
    {
        require(eth_sold > 0);
        uint256 token_reserve = token.balanceOf(address(this));
        return _getInputPrice(eth_sold, address(this).balance, token_reserve);
    }

    /**
     * @notice Public price function for Token to ETH trades with an exact input.
     * @param tokens_sold Amount of Tokens sold.
     * @return Amount of ETH that can be bought with input Tokens.
     */
    function getTokenToEthInputPrice(uint256 tokens_sold)
        external
        view
        isInitialized
        returns (uint256)
    {
        require(tokens_sold > 0);
        uint256 token_reserve = token.balanceOf(address(this));
        uint256 eth_bought = _getInputPrice(
            tokens_sold,
            token_reserve,
            address(this).balance
        );
        return eth_bought;
    }

    function setFeePct(uint256 _feePct) external auth(CHANGE_FEES_ROLE) {
        _setFeePct(_feePct);
    }

    function _ethToTokenInput(
        uint256 eth_sold,
        uint256 min_tokens,
        uint256 deadline,
        address buyer,
        address recipient
    ) private returns (uint256) {
        require(deadline >= block.timestamp && eth_sold > 0 && min_tokens > 0);

        uint256 token_reserve = token.balanceOf(address(this));
        uint256 tokens_bought = _getInputPrice(
            eth_sold,
            address(this).balance.sub(eth_sold),
            token_reserve
        );
        require(tokens_bought >= min_tokens);

        require(token.transfer(recipient, tokens_bought));

        emit TokenPurchase(buyer, eth_sold, tokens_bought);

        return tokens_bought;
    }

    function _tokenToEthInput(
        uint256 tokens_sold,
        uint256 min_eth,
        uint256 deadline,
        address buyer,
        address recipient /* payable */
    ) private returns (uint256) {
        require(deadline >= block.timestamp && tokens_sold > 0 && min_eth > 0);

        uint256 token_reserve = token.balanceOf(address(this));
        uint256 eth_bought = _getInputPrice(
            tokens_sold,
            token_reserve,
            address(this).balance
        );
        require(eth_bought >= min_eth);

        recipient.transfer(eth_bought);
        require(token.transferFrom(buyer, address(this), tokens_sold));

        emit EthPurchase(buyer, tokens_sold, eth_bought);

        return eth_bought;
    }

    function _setFeePct(uint256 _feePct) internal {
        require(_feePct > 0, "INVALID_FEE_PCT");
        feePct = _feePct;
    }

    /**
     * @dev Pricing function for converting between ETH && Tokens.
     * @param input_amount Amount of ETH or Tokens being sold.
     * @param input_reserve Amount of ETH or Tokens (input type) in exchange reserves.
     * @param output_reserve Amount of ETH or Tokens (output type) in exchange reserves.
     * @return Amount of ETH or Tokens bought.
     */
    function _getInputPrice(
        uint256 input_amount,
        uint256 input_reserve,
        uint256 output_reserve
    ) internal view returns (uint256) {
        require(input_reserve > 0 && output_reserve > 0, "INVALID_VALUE");

        uint256 input_amount_minus_fee = input_amount.mul(BASE_PCT - feePct);
        uint256 numerator = input_amount_minus_fee.mul(output_reserve);
        uint256 denominator = input_reserve.mul(BASE_PCT).add(
            input_amount_minus_fee
        );

        return numerator / denominator;
    }
}
